package users

import (
	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/handlers" // Import handlers
	"backend_monolithic/internal/models"
	"backend_monolithic/pkg/mailer" // Import mailer
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB                  *gorm.DB
	AuthService         *auth.Service
	NotificationService *handlers.NotificationHandler // Placeholder, assuming it's available
	Mailer              *mailer.Mailer                // Add mailer
}

func NewUserHandler(db *gorm.DB, authService *auth.Service, notificationService *handlers.NotificationHandler, mailer *mailer.Mailer) *UserHandler {
	return &UserHandler{DB: db, AuthService: authService, NotificationService: notificationService, Mailer: mailer}
}


type RegisterRequest struct {
	FirstName  string `json:"first_name" validate:"required"`
	LastName   string `json:"last_name" validate:"required"`
	Email      string `json:"email" validate:"required"`
	Password   string `json:"password" validate:"required"`
	Profession string `json:"profession" validate:"required"`
}

func (h *UserHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	// Check existing user
	var existingUser models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Email already in use",
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not hash password",
		})
	}

	// Create user
	user := &models.User{
		Email:      req.Email,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Password:   string(hashedPassword),
		Profession: req.Profession,
		Activated: false,
	}

	if err := h.DB.Create(user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Generate activation token
	tokenBytes := make([]byte, 32)
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate activation token"})
	}
	activationToken := base64.URLEncoding.EncodeToString(tokenBytes)

	// Save activation token
	expiresAt := time.Now().Add(24 * time.Hour) // Token valid for 24 hours
	activation := &models.ActivationToken{
		UserID:    user.ID,
		Token:     activationToken,
		ExpiresAt: expiresAt,
	}
	if err := h.DB.Create(activation).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save activation token"})
	}

	// Send activation email
	activationLink := fmt.Sprintf("http://localhost:8080/activate?token=%s", activationToken) // TODO: Make domain configurable
	subject := "Activate your SafeDeal Account"
	body := fmt.Sprintf(`
		<h1>Welcome to SafeDeal!</h1>
		<p>Thank you for registering. Please click the link below to activate your account:</p>
		<p><a href="%s">Activate Account</a></p>
		<p>This link will expire in 24 hours.</p>
	`, activationLink)

	if err := h.Mailer.SendEmail([]string{user.Email}, subject, body); err != nil {
		// Log the error but don't fail the registration if email sending fails
		// In a real application, you might want to queue emails for retry
		fmt.Printf("Failed to send activation email to %s: %v\n", user.Email, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Registration successful. Please check your email to activate your account.",
	})
}

// ActivateAccount handles the account activation process using a token
func (h *UserHandler) ActivateAccount(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Activation token is missing"})
	}

	var activation models.ActivationToken
	if err := h.DB.Where("token = ?", token).First(&activation).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid or expired activation token"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	if activation.ExpiresAt.Before(time.Now()) {
		// Token expired, delete it and respond
		h.DB.Delete(&activation)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Activation token has expired"})
	}

	var user models.User
	if err := h.DB.First(&user, activation.UserID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Activated {
		// User already activated, delete token
		h.DB.Delete(&activation)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Account already activated"})
	}

	user.Activated = true
	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to activate account"})
	}

	// Delete the activation token after successful activation
	if err := h.DB.Delete(&activation).Error; err != nil {
		fmt.Printf("Failed to delete activation token: %v\n", err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Account activated successfully"})
}


