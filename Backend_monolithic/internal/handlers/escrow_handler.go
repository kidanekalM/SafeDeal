package handlers

import (
	"errors"
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
		BuyerID           uint               `json:"buyer_id"`
		SellerID          uint               `json:"seller_id" validate:"required"`
		MediatorID        *uint              `json:"mediator_id,omitempty"`
		Amount            uint               `json:"amount" validate:"required,gt=0"`
		Conditions        string             `json:"conditions"`
		Jurisdiction      string             `json:"jurisdiction"`
		GoverningLaw      string             `json:"governing_law"`
		DisputeResolution string             `json:"dispute_resolution"`
		Milestones        []models.Milestone `json:"milestones,omitempty"` // Optional milestones
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Determine roles based on creator and handle mediator assignment
	var finalBuyerID, finalSellerID uint
	creatorRole := c.Query("role", "buyer")

	if creatorRole == "mediator" {
		if req.BuyerID == 0 || req.SellerID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Mediator must specify both buyer and seller"})
		}
		finalBuyerID = req.BuyerID
		finalSellerID = req.SellerID
		// Set creator as the mediator by default if not specified
		if req.MediatorID == nil {
			req.MediatorID = &userID
		}
	} else if creatorRole == "seller" {
		finalBuyerID = req.BuyerID
		finalSellerID = userID
		if finalBuyerID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Seller must specify a buyer"})
		}
	} else { // buyer
		finalBuyerID = userID
		finalSellerID = req.SellerID
		if finalSellerID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Buyer must specify a seller"})
		}
	}

	// Verify all parties exist
	var buyerUser, sellerUser models.User
	if err := h.DB.First(&buyerUser, finalBuyerID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Buyer not found"})
	}
	if err := h.DB.First(&sellerUser, finalSellerID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Seller not found"})
	}
	if req.MediatorID != nil {
		var mediatorUser models.User
		if err := h.DB.First(&mediatorUser, *req.MediatorID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Mediator not found"})
		}
	}

	// Create escrow record
	escrow := &models.Escrow{
		BuyerID:           finalBuyerID,
		SellerID:          finalSellerID,
		MediatorID:        req.MediatorID,
		Amount:            req.Amount,
		Conditions:        req.Conditions,
		Jurisdiction:      req.Jurisdiction,
		GoverningLaw:      req.GoverningLaw,
		DisputeResolution: req.DisputeResolution,
		Status:            "Pending",
	}

	result = h.DB.Create(escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create escrow"})
	}

	// Conditionally create milestones if provided
	if req.Milestones != nil && len(req.Milestones) > 0 {
		for i := range req.Milestones {
			// If no approver is specified, default to the buyer (payer)
			if req.Milestones[i].ApproverID == nil {
				req.Milestones[i].ApproverID = &userID
			}
			
			// Associate milestone with escrow
			req.Milestones[i].EscrowID = escrow.ID
			req.Milestones[i].Status = models.MilestonePending // Default status
			
			// Ensure proper validation
			if req.Milestones[i].Title == "" {
				return c.Status(400).JSON(fiber.Map{"error": "Milestone title is required"})
			}
			
			if req.Milestones[i].Amount == 0 {
				return c.Status(400).JSON(fiber.Map{"error": "Milestone amount is required"})
			}
			
			// Create milestone
			result = h.DB.Create(&req.Milestones[i])
			if result.Error != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Could not create milestone"})
			}
		}
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
		buyerAddr := common.HexToAddress(seller.WalletAddress) // Buyer is the user creating the escrow
		sellerAddr := common.HexToAddress(seller.WalletAddress) // Seller is the fetched user
		amount := big.NewInt(int64(req.Amount))

		tx, err := h.BlockchainClient.CreateEscrow(buyerAddr, sellerAddr, amount)
		if err != nil {
			log.Printf("Failed to create escrow on blockchain: %v", err)
			// Note: We don't rollback the database transaction as that was successful
		} else {
			log.Printf("Successfully created escrow on blockchain with TX: %v", tx.Hash().Hex())
		}
	}

	// Fetch the complete escrow with preloads for the response
	var completeEscrow models.Escrow
	h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").First(&completeEscrow, escrow.ID)

	return c.JSON(fiber.Map{
		"message": "Escrow created successfully",
		"data":    completeEscrow,
	})
}

func (h *EscrowHandler) GetEscrowByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var escrow models.Escrow
	result := h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").Preload("Milestones.Approver").First(&escrow, uint(id))
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
	result := h.DB.Where("buyer_id = ? OR seller_id = ? OR mediator_id = ?", userID, userID, userID).
		Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").Preload("Milestones.Approver").Find(&escrows)
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

	var escrows []models.Escrow
	result := h.DB.Where("buyer_id = ? OR seller_id = ?", userID, userID).Find(&escrows)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Collect unique contact IDs
	contactIDs := make(map[uint]bool)
	for _, escrow := range escrows {
		if escrow.BuyerID != userID {
			contactIDs[escrow.BuyerID] = true
		}
		if escrow.SellerID != userID {
			contactIDs[escrow.SellerID] = true
		}
	}

	var contacts []models.User
	for contactID := range contactIDs {
		var user models.User
		if err := h.DB.First(&user, contactID).Error; err != nil {
			continue // Skip if user not found
		}
		contacts = append(contacts, user)
	}

	return c.JSON(contacts)
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

	// Only the buyer can cancel the escrow before funding
	if escrow.BuyerID != userID || escrow.Status != "Pending" {
		return c.Status(403).JSON(fiber.Map{"error": "Only the buyer can cancel pending escrow"})
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

func (h *EscrowHandler) AcceptEscrow(c *fiber.Ctx) error {
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

	// Only the seller can accept the escrow
	if escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only seller can accept escrow"})
	}

	if escrow.Status != "Pending" {
		return c.Status(400).JSON(fiber.Map{"error": "Escrow is not in pending state"})
	}

	escrow.Status = "Funded"
	result = h.DB.Save(&escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
	}
	if err := h.RabbitMQ.Publish("escrow.funded", eventData); err != nil {
		log.Printf("Failed to publish escrow.funded event: %v", err)
	}

	// Update all milestones to funded status if they exist
	var milestones []models.Milestone
	h.DB.Where("escrow_id = ?", escrow.ID).Find(&milestones)
	for i := range milestones {
		milestones[i].Status = models.MilestoneFunded
		h.DB.Save(&milestones[i])
	}

	// Interact with blockchain to fund the escrow
	if h.BlockchainClient != nil {
		escrowID := big.NewInt(int64(escrow.ID))
		
		tx, err := h.BlockchainClient.ConfirmPayment(escrowID)
		if err != nil {
			log.Printf("Failed to confirm payment on blockchain for escrow %d: %v", escrow.ID, err)
		} else {
			log.Printf("Successfully confirmed payment on blockchain for escrow %d with TX: %v", escrow.ID, tx.Hash().Hex())
		}
	}

	return c.JSON(fiber.Map{
		"data": escrow,
	})
}

func (h *EscrowHandler) ConfirmReceipt(c *fiber.Ctx) error {
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

	// Only the buyer can confirm receipt
	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only buyer can confirm receipt"})
	}

	if escrow.Status != "Funded" {
		return c.Status(400).JSON(fiber.Map{"error": "Escrow is not in funded state"})
	}

	escrow.Status = "Released"
	result = h.DB.Save(&escrow)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	// Publish event to RabbitMQ
	eventData := map[string]interface{}{
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
	}
	if err := h.RabbitMQ.Publish("escrow.released", eventData); err != nil {
		log.Printf("Failed to publish escrow.released event: %v", err)
	}

	// Interact with blockchain to finalize escrow
	if h.BlockchainClient != nil {
		escrowID := big.NewInt(int64(escrow.ID))
		
		tx, err := h.BlockchainClient.FinalizeEscrow(escrowID)
		if err != nil {
			log.Printf("Failed to finalize escrow on blockchain for escrow %d: %v", escrow.ID, err)
		} else {
			log.Printf("Successfully finalized escrow on blockchain for escrow %d with TX: %v", escrow.ID, tx.Hash().Hex())
		}
	}

	return c.JSON(fiber.Map{"message": "Receipt confirmed successfully"})
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

// CancelEscrow continues...