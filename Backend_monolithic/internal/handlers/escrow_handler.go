package handlers

import (
	"errors"
	"fmt"
	"log"
	"math/big"
	"strconv"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/models"
	"backend_monolithic/internal/rabbitmq"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type EscrowHandler struct {
	DB             *gorm.DB
	AuthService    *auth.Service
	RabbitMQ       *rabbitmq.Producer
	BlockchainClient *blockchain.Client
}

func NewEscrowHandler(db *gorm.DB, authService *auth.Service, rabbitMQ *rabbitmq.Producer, blockchainClient *blockchain.Client) *EscrowHandler {
	return &EscrowHandler{
		DB:             db,
		AuthService:    authService,
		RabbitMQ:       rabbitMQ,
		BlockchainClient: blockchainClient,
	}
}

func (h *EscrowHandler) CreateEscrow(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		SellerID   uint   `json:"seller_id" validate:"required"`
		Amount     uint   `json:"amount" validate:"required,gt=0"`
		Conditions string `json:"conditions,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Check if seller exists
	var seller models.User
	if err := h.DB.First(&seller, req.SellerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(400).JSON(fiber.Map{"error": "Seller not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Get buyer from database to access their blockchain address
	buyer, err := h.AuthService.GetUserByID(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Buyer not found"})
	}

	// Get seller's blockchain address
	sellerFromDB, err := h.AuthService.GetUserByID(req.SellerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Seller not found"})
	}

	escrow := &models.Escrow{
		BuyerID:    userID,
		SellerID:   req.SellerID,
		Amount:     req.Amount,
		Conditions: req.Conditions,
		Status:     "Pending",
	}

	if err := h.DB.Create(escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"buyer_id":  escrow.BuyerID,
		"seller_id": escrow.SellerID,
		"amount":    escrow.Amount,
	}
	if err := h.RabbitMQ.Publish("escrow.created", eventData); err != nil {
		log.Printf("Failed to publish escrow.created event: %v", err)
	}

	// Interact with blockchain to create the escrow
	if h.BlockchainClient != nil {
		buyerAddr := common.HexToAddress(buyer.WalletAddress) // Assuming WalletAddress field exists
		sellerAddr := common.HexToAddress(sellerFromDB.WalletAddress)
		amount := big.NewInt(int64(req.Amount))

		tx, err := h.BlockchainClient.CreateEscrow(buyerAddr, sellerAddr, amount)
		if err != nil {
			log.Printf("Failed to create escrow on blockchain: %v", err)
			// Note: We don't rollback the database transaction as that was successful
		} else {
			log.Printf("Successfully created escrow on blockchain with TX: %v", tx.Hash().Hex())
		}
	}

	return c.JSON(escrow)
}

func (h *EscrowHandler) GetEscrowByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var escrow models.Escrow
	result := h.DB.Preload("Buyer").Preload("Seller").First(&escrow, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Check if the user is authorized to view this escrow
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
	}

	return c.JSON(escrow)
}

func (h *EscrowHandler) GetMyEscrows(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var escrows []models.Escrow
	result := h.DB.Where("buyer_id = ? OR seller_id = ?", userID, userID).
		Preload("Buyer").Preload("Seller").Find(&escrows)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(escrows)
}

func (h *EscrowHandler) GetEscrowContacts(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var contacts []models.Contact
	result := h.DB.Where("user_id = ?", userID).Find(&contacts)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	var contactIDs []uint
	for _, contact := range contacts {
		contactIDs = append(contactIDs, contact.ContactID)
	}

	var users []models.User
	if len(contactIDs) > 0 {
		result = h.DB.Where("id IN ?", contactIDs).Find(&users)
	} else {
		users = []models.User{}
	}

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(users)
}

func (h *EscrowHandler) CancelEscrow(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Only the buyer can cancel the escrow (before it's funded)
	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only buyer can cancel escrow"})
	}

	if escrow.Status != "Pending" {
		return c.Status(400).JSON(fiber.Map{"error": "Only pending escrows can be canceled"})
	}

	escrow.Status = "Canceled"
	result = h.DB.Save(&escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
	}
	if err := h.RabbitMQ.Publish("escrow.canceled", eventData); err != nil {
		log.Printf("Failed to publish escrow.canceled event: %v", err)
	}

	return c.JSON(fiber.Map{"message": "Escrow canceled successfully"})
}

func (h *EscrowHandler) CreateDispute(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Both buyer and seller can create a dispute
	if escrow.BuyerID != userID && escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only buyer or seller can create dispute"})
	}

	if escrow.Status != "Funded" && escrow.Status != "Active" {
		return c.Status(400).JSON(fiber.Map{"error": "Only funded or active escrows can be disputed"})
	}

	escrow.Status = "Disputed"
	result = h.DB.Save(&escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
	}
	if err := h.RabbitMQ.Publish("escrow.disputed", eventData); err != nil {
		log.Printf("Failed to publish escrow.disputed event: %v", err)
	}

	return c.JSON(fiber.Map{"message": "Dispute created successfully"})
}

func (h *EscrowHandler) GetDispute(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.Status != "Disputed" {
		return c.Status(400).JSON(fiber.Map{"error": "Escrow is not in dispute"})
	}

	return c.JSON(escrow)
}

func (h *EscrowHandler) RefundEscrow(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.Status != "Disputed" {
		return c.Status(400).JSON(fiber.Map{"error": "Only disputed escrows can be refunded"})
	}

	escrow.Status = "Refunded"
	result = h.DB.Save(&escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
	}
	if err := h.RabbitMQ.Publish("escrow.refunded", eventData); err != nil {
		log.Printf("Failed to publish escrow.refunded event: %v", err)
	}

	return c.JSON(fiber.Map{"message": "Escrow refunded successfully"})
}