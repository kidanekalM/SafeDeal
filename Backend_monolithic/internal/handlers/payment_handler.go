package handlers

import (
	"errors"
	"fmt"
	"log"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"backend_monolithic/internal/rabbitmq"
	"backend_monolithic/pkg/chapa"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
	RabbitMQ    *rabbitmq.Producer
}

func NewPaymentHandler(db *gorm.DB, authService *auth.Service, rabbitMQ *rabbitmq.Producer) *PaymentHandler {
	return &PaymentHandler{
		DB:          db,
		AuthService: authService,
		RabbitMQ:    rabbitMQ,
	}
}

func (h *PaymentHandler) InitiatePayment(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		EscrowID uint `json:"escrow_id" validate:"required"`
		Amount   uint `json:"amount" validate:"required,gt=0"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Verify that the user is the buyer of this escrow
	var escrow models.Escrow
	result := h.DB.First(&escrow, req.EscrowID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the buyer can initiate payment for this escrow"})
	}

	if escrow.Status != "Pending" {
		return c.Status(400).JSON(fiber.Map{"error": "Payment can only be initiated for pending escrows"})
	}

	// Create transaction record
	transaction := &models.Transaction{
		EscrowID:   req.EscrowID,
		BuyerID:    userID,
		Amount:     req.Amount,
		Currency:   "ETB",
		Status:     "Pending",
		TransactionRef: fmt.Sprintf("TXN_%d_%d", req.EscrowID, time.Now().Unix()),
	}

	result = h.DB.Create(transaction)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create transaction"})
	}

	// Initialize Chapa payment
	chapaClient := chapa.NewChapaClient()

	// Get user details for payment
	user, err := h.AuthService.GetUserByID(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not get user details"})
	}

	paymentReq := chapa.ChapaRequest{
		Amount: fmt.Sprintf("%.2f", float64(req.Amount)),
		Currency: "ETB",
		Email: user.Email,
		FirstName: user.FirstName,
		LastName: user.LastName,
		TxRef: transaction.TransactionRef,
		CallbackURL: fmt.Sprintf("https://yoursite.com/api/payments/callback/%s", transaction.TransactionRef),
		CustomTitle: "Escrow Payment",
		CustomDescription: "Secure escrow transaction via Chapa",
		HideReceipt: "true",
	}

	paymentURL, _, err := chapaClient.InitiatePayment(paymentReq)
	if err != nil {
		// Update transaction status to failed
		h.DB.Model(transaction).Update("status", "Failed")
		log.Printf("Chapa payment initialization failed: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Could not initialize payment with Chapa"})
	}

	// Update transaction with payment URL
	transaction.PaymentURL = paymentURL
	transaction.Status = "Pending"
	
	h.DB.Save(transaction)

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"transaction": transaction,
			"payment_url": paymentURL,
		},
	})
}

func (h *PaymentHandler) GetTransactions(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var transactions []models.Transaction
	result := h.DB.Where("buyer_id = ?", userID).Order("created_at DESC").Find(&transactions)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Calculate total count
	total := len(transactions)

	// Format response to match expected API response
	var formattedTransactions []interface{}
	for _, transaction := range transactions {
		formattedTransactions = append(formattedTransactions, fiber.Map{
			"id":              transaction.ID,
			"escrow_id":       transaction.EscrowID,
			"buyer_id":        transaction.BuyerID,
			"transaction_ref": transaction.TransactionRef,
			"amount":          transaction.Amount,
			"currency":        transaction.Currency,
			"status":          transaction.Status,
			"payment_url":     transaction.PaymentURL,
			"created_at":      transaction.CreatedAt,
			"updated_at":      transaction.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"transactions": formattedTransactions,
			"total":        total,
			"status":       "success",
		},
	})
}