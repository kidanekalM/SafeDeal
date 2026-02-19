package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
}

func NewUserHandler(db *gorm.DB, authService *auth.Service) *UserHandler {
	_ = godotenv.Load()
	return &UserHandler{
		DB:          db,
		AuthService: authService,
	}
}

func (h *UserHandler) Register(c *fiber.Ctx) error {
	var req struct {
		FirstName  string `json:"first_name" validate:"required,min=2,max=32"`
		LastName   string `json:"last_name" validate:"required,min=2,max=32"`
		Profession string `json:"profession"`
		Email      string `json:"email" validate:"required,email"`
		Password   string `json:"password" validate:"required,min=8"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Check if user already exists
	var existingUser models.User
	result := h.DB.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		return c.Status(400).JSON(fiber.Map{"error": "User with this email already exists"})
	}

	// Hash password
	hashedPassword, err := h.AuthService.HashPassword(req.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not hash password"})
	}

	// Generate activation code
	activationCode := fmt.Sprintf("%d", time.Now().UnixNano())

	user := &models.User{
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Profession:     req.Profession,
		Email:          req.Email,
		Password:       hashedPassword,
		ActivationCode: activationCode,
		Activated:      true, // Changed to true for testing purposes
	}

	if err := h.DB.Create(user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
	}

	// Generate token for the newly registered user
	token, err := h.AuthService.GenerateToken(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	// TODO: Send activation email with activationCode
	log.Printf("Activation code for %s: %s", req.Email, activationCode)

	// Remove password from response
	user.Password = ""

	return c.JSON(fiber.Map{
		"user":         user,
		"access_token": token,
		"message":      "Registration successful.",
	})
}

func (h *UserHandler) ActivateAccount(c *fiber.Ctx) error {
	email := c.Query("email")
	code := c.Query("code")

	if email == "" || code == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email and code are required"})
	}

	var user models.User
	result := h.DB.Where("email = ? AND activation_code = ?", email, code).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid activation code or email"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	user.Activated = true
	user.ActivationCode = ""
	h.DB.Save(&user)

	return c.JSON(fiber.Map{"message": "Account activated successfully"})
}

func (h *UserHandler) Login(c *fiber.Ctx) error {
	var req struct {
		Email    string `json:"email" validate:"required,email"`
		Password string `json:"password" validate:"required,min=8"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := h.AuthService.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	if !h.AuthService.CheckPasswordHash(req.Password, user.Password) {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	if !user.Activated {
		return c.Status(401).JSON(fiber.Map{
			"error": "Account not activated. Please check your email.",
		})
	}

	token, err := h.AuthService.GenerateToken(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Could not generate token",
		})
	}

	// Remove password from response
	user.Password = ""

	return c.JSON(fiber.Map{
		"user":         user,
		"access_token": token,
		// Note: refresh_token is optional since it should be handled via HTTP-only cookie in production
	})
}

func (h *UserHandler) RefreshToken(c *fiber.Ctx) error {
	// Extract user ID from the token passed in the Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" || len(authHeader) <= 7 || authHeader[:7] != "Bearer " {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid authorization header format",
		})
	}

	token := authHeader[7:]
	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	// Generate a new access token
	newToken, err := h.AuthService.GenerateToken(claims.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Could not refresh token",
		})
	}

	return c.JSON(fiber.Map{
		"access_token": newToken,
		"expires_in":   86400, // 24 hours in seconds
	})
}

func (h *UserHandler) ResendActivation(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email" validate:"required,email"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user models.User
	result := h.DB.Where("email = ? AND activated = ?", req.Email, false).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(400).JSON(fiber.Map{"error": "User not found or already activated"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Generate new activation code
	newCode := fmt.Sprintf("%d", time.Now().UnixNano())
	user.ActivationCode = newCode
	h.DB.Save(&user)

	// TODO: Send activation email with newCode
	log.Printf("New activation code for %s: %s", req.Email, newCode)

	return c.JSON(fiber.Map{"message": "New activation code sent"})
}

func (h *UserHandler) Logout(c *fiber.Ctx) error {
	// In a real implementation, you might want to blacklist the token
	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user models.User
	result := h.DB.First(&user, userID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Remove password from response
	user.Password = ""

	return c.JSON(fiber.Map{
		"data": user,
	})
}

func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Prevent updating sensitive fields
	delete(updates, "password")
	delete(updates, "email")
	delete(updates, "activated")

	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update profile"})
	}

	// Fetch updated user to return
	var updatedUser models.User
	h.DB.First(&updatedUser, userID)
	updatedUser.Password = "" // Remove password from response

	return c.JSON(fiber.Map{
		"data": updatedUser,
	})
}

func (h *UserHandler) UpdateBankDetails(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var bankDetails models.BankDetails
	if err := c.BodyParser(&bankDetails); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Check if bank details already exist for this user
	var existingDetails models.BankDetails
	result := h.DB.Where("user_id = ?", userID).First(&existingDetails)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create new bank details
			bankDetails.UserID = userID
			if err := h.DB.Create(&bankDetails).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Could not create bank details"})
			}
		} else {
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
	} else {
		// Update existing bank details
		if err := h.DB.Model(&existingDetails).Updates(bankDetails).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not update bank details"})
		}
	}

	// Return the updated user with bank details
	var user models.User
	h.DB.First(&user, userID)
	user.Password = ""

	return c.JSON(fiber.Map{
		"data": user,
	})
}

func (h *UserHandler) Search(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		query = c.Params("query")
	}

	if query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query parameter is required"})
	}

	var users []models.User
	result := h.DB.Where("activated = ? AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?)", 
		true, "%"+query+"%", "%"+query+"%", "%"+query+"%").Find(&users)
	
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(users)
}

func (h *UserHandler) SearchUsers(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query parameter is required"})
	}

	var users []models.User
	result := h.DB.Where("activated = ? AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?)", 
		true, "%"+query+"%", "%"+query+"%", "%"+query+"%").Find(&users)
	
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Format response to match expected format with data wrapper
	response := fiber.Map{
		"data": fiber.Map{
			"users": users,
			"pagination": nil, // Frontend expects pagination field but setting to nil for now
		},
	}

	return c.JSON(response)
}

func (h *UserHandler) ManageWallet(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Fetch the user to return in the response
	var user models.User
	result := h.DB.First(&user, userID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// If the user doesn't have a wallet, create one
	if user.WalletAddress == "" {
		// This is a placeholder implementation
		// In a real implementation, you would generate a wallet for the user
		// and store the encrypted private key and wallet address in the database
		return c.Status(501).JSON(fiber.Map{
			"error": "Wallet creation not yet implemented in this version",
		})
	}

	// Remove password from response
	user.Password = ""

	return c.JSON(fiber.Map{
		"data": user,
	})
}

func (h *UserHandler) Protect(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header missing",
		})
	}

	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	c.Locals("userID", claims.UserID)
	return c.Next()
}