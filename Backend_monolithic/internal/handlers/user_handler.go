package handlers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/ethereum/go-ethereum/crypto"
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
		Activated: true,
	}

	if err := h.DB.Create(user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
	}

	// TODO: Send activation email with activationCode
	log.Printf("Activation code for %s: %s", req.Email, activationCode)

	return c.JSON(fiber.Map{
		"message": "Registration successful. Please check your email for activation.",
		"user":    user,
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
	})
}

func (h *UserHandler) RefreshToken(c *fiber.Ctx) error {
	// Implementation depends on refresh token strategy
	return c.JSON(fiber.Map{
		"message": "Refresh token endpoint",
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

	return c.JSON(user)
}

func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
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

	return c.JSON(fiber.Map{"message": "Profile updated successfully"})
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

	return c.JSON(fiber.Map{"message": "Bank details updated successfully"})
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

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"users": users,
		},
		"message": "Search completed successfully",
	})
}

func (h *UserHandler) SearchUsers(c *fiber.Ctx) error {
	query := c.Query("q")
	
	// If no query is provided, return all activated users
	if query == "" {
		var users []models.User
		result := h.DB.Where("activated = ?", true).Find(&users)
		if result.Error != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}

		return c.JSON(fiber.Map{
			"data": fiber.Map{
				"users":      users,
				"pagination": fiber.Map{},
			},
			"message": "All users retrieved successfully",
		})
	}

	var users []models.User
	result := h.DB.Where("activated = ? AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?)", 
		true, "%"+query+"%", "%"+query+"%", "%"+query+"%").Find(&users)
	
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"users":      users,
			"pagination": fiber.Map{},
		},
		"message": "Search completed successfully",
	})
}

func (h *UserHandler) CreateWallet(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Generate a new Ethereum wallet
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Could not generate wallet",
		})
	}

	// Get the wallet address
	address := crypto.PubkeyToAddress(privateKey.PublicKey).Hex()

	// Encrypt the private key using AES encryption
	encryptionKey := []byte("k3l5m9n2p7q8r4s6t1u3v6w9x2y8z5a1") // Use the same key as in env
	encryptedPrivateKey, err := encryptAES(hex.EncodeToString(crypto.FromECDSA(privateKey)), encryptionKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Could not encrypt private key",
		})
	}

	// Update the user record with wallet information
	var user models.User
	result := h.DB.First(&user, userID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	user.WalletAddress = address
	user.EncryptedPrivateKey = encryptedPrivateKey

	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not save wallet information"})
	}

	// Return the wallet address (do not return the private key for security reasons)
	return c.JSON(fiber.Map{
		"wallet_address": address,
		"message": "Wallet created successfully",
	})
}

func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	var users []models.User
	result := h.DB.Where("activated = ?", true).Find(&users)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(fiber.Map{
		"users": users,
		"total": len(users),
	})
}

func (h *UserHandler) ManageWallet(c *fiber.Ctx) error {
	// Placeholder for wallet functionality
	return c.JSON(fiber.Map{"message": "Wallet action endpoint"})
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

// Helper function to encrypt data using AES
func encryptAES(plaintext string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}