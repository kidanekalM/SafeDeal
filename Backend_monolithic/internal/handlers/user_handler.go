package handlers

import (
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
	"regexp"
)

type UserHandler struct {
	DB                  *gorm.DB
	AuthService         *auth.Service
	NotificationHandler *NotificationHandler
}

func NewUserHandler(db *gorm.DB, authService *auth.Service, notificationHandler *NotificationHandler) *UserHandler {
	_ = godotenv.Load()
	return &UserHandler{
		DB:                  db,
		AuthService:         authService,
		NotificationHandler: notificationHandler,
	}
}

func (h *UserHandler) Register(c *fiber.Ctx) error {
	var req struct {
		FirstName     string `json:"first_name" validate:"required,min=2,max=32"`
		LastName      string `json:"last_name" validate:"required,min=2,max=32"`
		Profession    string `json:"profession"`
		Email         string `json:"email" validate:"required,email"`
		Password      string `json:"password" validate:"required,min=8"`
		AccountName   string `json:"account_name" validate:"required"`
		AccountNumber string `json:"account_number" validate:"required"`
		BankCode      int    `json:"bank_code" validate:"required"`
		BankName      string `json:"bank_name" validate:"required"`
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
		AccountName:    req.AccountName,
		AccountNumber:  req.AccountNumber,
		BankCode:       req.BankCode,
		BankName:       req.BankName,
		ActivationCode: activationCode,
		Activated:      true, // Auto-activate for testing purposes
	}

	if err := h.DB.Create(user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create user"})
	}

	// Also create entry in BankDetails table
	bankDetails := &models.BankDetails{
		UserID:        user.ID,
		AccountName:   req.AccountName,
		AccountNumber: req.AccountNumber,
		BankCode:      req.BankCode,
		BankName:      req.BankName,
	}
	h.DB.Create(bankDetails)

	// Automatically create a wallet for the new user
	wallet, err := generateWallet()
	if err != nil {
		log.Printf("Failed to generate wallet for user %s: %v", req.Email, err)
		// Don't fail the registration if wallet creation fails
	} else {
		// Encrypt the private key before storing
		encryptedPrivateKey := base64.StdEncoding.EncodeToString(wallet.PrivateKey)

		// Update the user's record with wallet info
		updateErr := h.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
			"wallet_address":        wallet.Address,
			"encrypted_private_key": encryptedPrivateKey,
		}).Error

		if updateErr != nil {
			log.Printf("Failed to update user %d with wallet info: %v", user.ID, updateErr)
		} else {
			log.Printf("Wallet created for user %s with address %s", req.Email, wallet.Address)
		}
	}

	// Send activation email with activationCode
	h.NotificationHandler.SendActivationEmail(req.Email, activationCode)
	log.Printf("Activation code for %s: %s", req.Email, activationCode)

	// Remove password from response
	user.Password = ""

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
	// In this implementation, we'll just generate a new token 
	// based on the valid token in the Authorization header.
	// In a more robust system, you'd use a dedicated refresh token.
	
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Authorization header missing"})
	}

	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid token"})
	}

	newToken, err := h.AuthService.GenerateToken(claims.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not generate token"})
	}

	return c.JSON(fiber.Map{
		"access_token": newToken,
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

	// Send activation email with newCode
	h.NotificationHandler.SendActivationEmail(req.Email, newCode)
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

func (h *UserHandler) GetTrustInsights(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}
	var completedCount int64
	var disputedCount int64
	var refundedCount int64
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Released").Count(&completedCount)
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Disputed").Count(&disputedCount)
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Refunded").Count(&refundedCount)

	return c.JSON(fiber.Map{
		"trust_score": user.TrustScore,
		"factors": fiber.Map{
			"completed": completedCount,
			"disputed":  disputedCount,
			"refunded":  refundedCount,
		},
	})
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

	// Fetch updated user
	var updatedUser models.User
	h.DB.First(&updatedUser, userID)
	updatedUser.Password = ""

	return c.JSON(updatedUser)
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

	// Update User table as well for easier retrieval
	h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"account_name":   bankDetails.AccountName,
		"account_number": bankDetails.AccountNumber,
		"bank_code":      bankDetails.BankCode,
		"bank_name":      bankDetails.BankName,
	})

	// Fetch updated user
	var updatedUser models.User
	h.DB.First(&updatedUser, userID)
	updatedUser.Password = ""

	return c.JSON(updatedUser)
}

func (h *UserHandler) GetBankDetails(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var bankDetails models.BankDetails
	result := h.DB.Where("user_id = ?", userID).First(&bankDetails)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Bank details not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(bankDetails)
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

	// Check if we should send an invitation (if query is an email and no results found)
	emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)
	if len(users) == 0 && emailRegex.MatchString(query) {
		h.NotificationHandler.InviteUser(query)
		return c.JSON(fiber.Map{
			"data": fiber.Map{
				"users":      []models.User{},
				"pagination": fiber.Map{},
				"invited":    true,
			},
			"message": "User not found. Invitation sent to " + query,
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"users":      users,
			"pagination": fiber.Map{},
		},
		"message": "Search completed successfully",
	})
}

func (h *UserHandler) ManageWallet(c *fiber.Ctx) error {
	// Placeholder for wallet functionality
	return c.JSON(fiber.Map{"message": "Wallet action endpoint"})
}

// CreateWallet creates a new Ethereum wallet for the authenticated user
func (h *UserHandler) CreateWallet(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Generate a new wallet
	wallet, err := generateWallet()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate wallet",
		})
	}

	// Encrypt the private key before storing
	// Note: In a real application, you'd want to use a stronger encryption method
	// and potentially derive the encryption key from the user's password
	encryptedPrivateKey := base64.StdEncoding.EncodeToString(wallet.PrivateKey)

	// Update the user's record with wallet info
	if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"wallet_address":        wallet.Address,
		"encrypted_private_key": encryptedPrivateKey,
	}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update user with wallet info"})
	}

	// Fetch updated user
	var updatedUser models.User
	h.DB.First(&updatedUser, userID)
	updatedUser.Password = ""

	return c.JSON(updatedUser)
}

// Wallet represents a cryptocurrency wallet
type Wallet struct {
	PrivateKey []byte `json:"private_key"` // Raw bytes of the private key
	Address    string `json:"address"`     // Ethereum address in hex format
}

// generateWallet creates a new Ethereum wallet
func generateWallet() (*Wallet, error) {
	privateKey, err := ecdsa.GenerateKey(crypto.S256(), rand.Reader)
	if err != nil {
		return nil, err
	}

	// Use the official Ethereum method to serialize the private key
	// This properly encodes the full ECDSA private key structure
	privateKeyBytes := crypto.FromECDSA(privateKey)
	address := crypto.PubkeyToAddress(privateKey.PublicKey).Hex()

	return &Wallet{
		PrivateKey: privateKeyBytes,
		Address:    address,
	}, nil
}

// GetAllUsers returns all activated users
func (h *UserHandler) GetAllUsers(c *fiber.Ctx) error {
	var users []models.User
	result := h.DB.Where("activated = ?", true).Find(&users)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Remove passwords from all users before returning
	for i := range users {
		users[i].Password = ""
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"users":      users,
			"pagination": fiber.Map{},
		},
		"message": "All users retrieved successfully",
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