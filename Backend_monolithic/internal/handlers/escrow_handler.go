package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"math/big"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/models"
	"backend_monolithic/internal/rabbitmq"

	"github.com/dslipak/pdf"
	"github.com/ethereum/go-ethereum/common"
	"github.com/go-resty/resty/v2"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type EscrowHandler struct {
	DB             *gorm.DB
	AuthService    *auth.Service
	RabbitMQ       *rabbitmq.Producer
	BlockchainClient *blockchain.Client
}

func (h *EscrowHandler) recordStatusEvent(escrowID uint, actorID uint, fromStatus string, toStatus string, reason string, txHash string, metadata string) {
	_ = h.DB.Create(&models.EscrowStatusEvent{
		EscrowID:   escrowID,
		ActorID:    actorID,
		FromStatus: fromStatus,
		ToStatus:   toStatus,
		Reason:     reason,
		TxHash:     txHash,
		Metadata:   metadata,
	}).Error
}

func (h *EscrowHandler) setEscrowStatus(escrow *models.Escrow, actorID uint, nextStatus string, reason string, txHash string, metadata string) error {
	prev := escrow.Status
	escrow.Status = nextStatus
	if err := h.DB.Save(escrow).Error; err != nil {
		return err
	}
	h.recordStatusEvent(escrow.ID, actorID, prev, nextStatus, reason, txHash, metadata)
	return nil
}

func (h *EscrowHandler) adjustTrustScore(userID uint, delta float64) {
	if userID == 0 || delta == 0 {
		return
	}
	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return
	}
	next := user.TrustScore + delta
	if next < 0 {
		next = 0
	}
	if next > 100 {
		next = 100
	}
	_ = h.DB.Model(&user).Update("trust_score", next).Error
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
	fee := uint(float64(req.Amount) * 0.02)
	escrow := &models.Escrow{
		BuyerID:           finalBuyerID,
		SellerID:          finalSellerID,
		MediatorID:        req.MediatorID,
		Amount:            req.Amount,
		PlatformFee:       fee,
		Conditions:        req.Conditions,
		Jurisdiction:      req.Jurisdiction,
		GoverningLaw:      req.GoverningLaw,
		DisputeResolution: req.DisputeResolution,
		Status:            "Pending",
	}

	if err := h.DB.Create(escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create escrow"})
	}
	h.recordStatusEvent(escrow.ID, userID, "", escrow.Status, "Escrow created", escrow.BlockchainTxHash, "")

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
			if err := h.DB.Create(&req.Milestones[i]).Error; err != nil {
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
		buyerAddr := common.HexToAddress(buyerUser.WalletAddress) // Buyer is the user creating the escrow
		sellerAddr := common.HexToAddress(sellerUser.WalletAddress) // Seller is the fetched user
		amount := big.NewInt(int64(req.Amount))

		tx, err := h.BlockchainClient.CreateEscrow(buyerAddr, sellerAddr, amount)
		if err != nil {
			log.Printf("Failed to create escrow on blockchain: %v", err)
		} else {
			log.Printf("Successfully created escrow on blockchain with TX: %v", tx.Hash().Hex())
			escrow.BlockchainTxHash = tx.Hash().Hex()
			h.DB.Save(escrow)
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

	if err := h.setEscrowStatus(&escrow, userID, "Canceled", "Canceled by buyer", "", ""); err != nil {
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

	if err := h.setEscrowStatus(&escrow, userID, "Funded", "Accepted by seller", "", ""); err != nil {
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
			escrow.BlockchainTxHash = tx.Hash().Hex()
			h.DB.Save(&escrow)
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

	if err := h.setEscrowStatus(&escrow, userID, "Released", "Buyer confirmed receipt", "", ""); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}
	h.adjustTrustScore(escrow.BuyerID, 2)
	h.adjustTrustScore(escrow.SellerID, 5)

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
			escrow.BlockchainTxHash = tx.Hash().Hex()
			h.DB.Save(&escrow)
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

	var req struct {
		Reason   string `json:"reason"`
		Evidence string `json:"evidence"`
	}
	_ = c.BodyParser(&req)
	escrow.DisputeReason = req.Reason
	escrow.DisputeStatus = "Open"
	if err := h.setEscrowStatus(&escrow, userID, "Disputed", "Dispute created", "", req.Evidence); err != nil {
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

	return c.JSON(fiber.Map{"message": "Dispute created successfully", "data": escrow})
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

	return c.JSON(fiber.Map{
		"id":              escrow.ID,
		"status":          escrow.Status,
		"dispute_status":  escrow.DisputeStatus,
		"dispute_reason":  escrow.DisputeReason,
		"resolution_note": escrow.ResolutionNote,
	})
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

	escrow.DisputeStatus = "ResolvedRefunded"
	if err := h.setEscrowStatus(&escrow, 0, "Refunded", "Dispute refunded", "", ""); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}
	h.adjustTrustScore(escrow.BuyerID, 1)
	h.adjustTrustScore(escrow.SellerID, -7)

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

func (h *EscrowHandler) UploadReceipt(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		ReceiptURL string `json:"receipt_url" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(id))
	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only buyer can upload receipt"})
	}

	escrow.ReceiptURL = req.ReceiptURL
	// When receipt is uploaded, we mark as Verifying (pending verification)
	if err := h.setEscrowStatus(&escrow, userID, "Verifying", "Receipt uploaded", "", req.ReceiptURL); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	return c.JSON(fiber.Map{
		"message": "Receipt uploaded successfully. Funds marked as secured.",
		"data":    escrow,
	})
}

func (h *EscrowHandler) VerifyCBEPayment(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		TransactionID string `json:"transaction_id" validate:"required"`
		AccountSuffix string `json:"account_suffix" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var escrow models.Escrow
	if err := h.DB.First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only buyer can verify payment"})
	}

	// 1. Check if this transaction ID has already been used
	var existingEscrow models.Escrow
	if err := h.DB.Where("transaction_ref = ?", req.TransactionID).First(&existingEscrow).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"error": "This transaction ID has already been used"})
	}

	// 2. Fetch and Parse CBE Receipt
	fullId := req.TransactionID + req.AccountSuffix
	url := fmt.Sprintf("https://apps.cbe.com.et:100/?id=%s", fullId)

	client := resty.New()
	resp, err := client.R().
		SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36").
		SetHeader("Accept", "application/pdf").
		Get(url)

	if err != nil {
		log.Printf("Failed to fetch CBE receipt: %v", err)
		return c.Status(502).JSON(fiber.Map{"error": "Failed to connect to CBE verification service"})
	}

	if resp.StatusCode() != 200 {
		return c.Status(502).JSON(fiber.Map{"error": "CBE service returned an error"})
	}

	// Parse PDF content
	pdfContent := resp.Body()
	pdfReader, err := pdf.NewReader(bytes.NewReader(pdfContent), int64(len(pdfContent)))
	if err != nil {
		log.Printf("Failed to parse PDF: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to process CBE receipt"})
	}

	var buf bytes.Buffer
	b, err := pdfReader.GetPlainText()
	if err != nil {
		log.Printf("Failed to extract text from PDF: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read CBE receipt content"})
	}
	_, _ = buf.ReadFrom(b)
	plainText := buf.String()

	// Normalize text
	plainText = strings.ReplaceAll(plainText, "\n", " ")
	plainText = strings.ReplaceAll(plainText, "\r", " ")

	// 3. Extract and Verify Details
	// Extract Reference No.
	refRegex := regexp.MustCompile(`Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)`)
	refMatches := refRegex.FindStringSubmatch(plainText)
	if len(refMatches) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "Could not find transaction reference in CBE receipt"})
	}
	extractedRef := strings.TrimSpace(refMatches[1])

	if extractedRef != req.TransactionID {
		return c.Status(400).JSON(fiber.Map{"error": fmt.Sprintf("Transaction ID mismatch. Found %s but expected %s", extractedRef, req.TransactionID)})
	}

	// Extract Amount
	amountRegex := regexp.MustCompile(`Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB`)
	amountMatches := amountRegex.FindStringSubmatch(plainText)
	if len(amountMatches) < 2 {
		return c.Status(400).JSON(fiber.Map{"error": "Could not find amount in CBE receipt"})
	}
	amountStr := strings.ReplaceAll(amountMatches[1], ",", "")
	extractedAmount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse amount from receipt"})
	}

	// Verify amount (allow for small differences if any)
	expectedAmount := float64(escrow.Amount + escrow.PlatformFee)
	if extractedAmount < expectedAmount {
		return c.Status(400).JSON(fiber.Map{"error": fmt.Sprintf("Insufficient payment. Found %.2f but expected %.2f", extractedAmount, expectedAmount)})
	}

	// 4. Update escrow status
	prevStatus := escrow.Status
	escrow.Status = "Funded"
	escrow.TransactionRef = req.TransactionID
	escrow.Active = true // Mark as active when funded

	if err := h.DB.Save(&escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow status"})
	}
	h.recordStatusEvent(escrow.ID, userID, prevStatus, "Funded", "CBE payment verified", "", req.TransactionID)

	// Update milestones
	var milestones []models.Milestone
	h.DB.Where("escrow_id = ?", escrow.ID).Find(&milestones)
	for i := range milestones {
		milestones[i].Status = models.MilestoneFunded
		h.DB.Save(&milestones[i])
	}

	// Publish event
	eventData := map[string]interface{}{
		"escrow_id":       escrow.ID,
		"status":          escrow.Status,
		"transaction_ref": escrow.TransactionRef,
		"amount_verified": extractedAmount,
	}
	h.RabbitMQ.Publish("escrow.funded", eventData)

	return c.JSON(fiber.Map{
		"message": "Payment verified and escrow funded!",
		"data":    escrow,
	})
}

func (h *EscrowHandler) UpdateEscrow(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Amount     uint   `json:"amount"`
		Conditions string `json:"conditions"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var escrow models.Escrow
	if err := h.DB.First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only participants can update escrow"})
	}

	if escrow.IsLocked {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot update locked escrow"})
	}

	if req.Amount > 0 {
		escrow.Amount = req.Amount
	}
	if req.Conditions != "" {
		escrow.Conditions = req.Conditions
	}

	if err := h.DB.Save(&escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
	}

	return c.JSON(escrow)
}

func (h *EscrowHandler) LockEscrow(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var escrow models.Escrow
	if err := h.DB.First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only participants can lock escrow"})
	}

	escrow.IsLocked = true
	if err := h.DB.Save(&escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not lock escrow"})
	}

	return c.JSON(fiber.Map{"message": "Escrow locked successfully", "data": escrow})
}

func (h *EscrowHandler) VerifyPayment(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok || userID != 2 {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized. Admin only."})
	}

	var req struct {
		Action string `json:"action" validate:"required,oneof=approve reject"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var escrow models.Escrow
	if err := h.DB.First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if req.Action == "approve" {
		if err := h.setEscrowStatus(&escrow, userID, "Funded", "Admin approved payment", "", ""); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
		}
	} else {
		if err := h.setEscrowStatus(&escrow, userID, "Pending", "Admin rejected payment", "", ""); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
		}
		escrow.ReceiptURL = "" // Clear invalid receipt
		if err := h.DB.Save(&escrow).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not update escrow"})
		}
	}

	return c.JSON(fiber.Map{"message": "Payment verification complete", "status": escrow.Status})
}

func (h *EscrowHandler) GetStatusHistory(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}
	var events []models.EscrowStatusEvent
	if err := h.DB.Where("escrow_id = ?", uint(id)).Order("created_at asc").Find(&events).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	return c.JSON(events)
}

func (h *EscrowHandler) ResolveDispute(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}
	var req struct {
		Action string `json:"action"`
		Note   string `json:"note"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	var escrow models.Escrow
	if err := h.DB.First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}
	if escrow.Status != "Disputed" {
		return c.Status(400).JSON(fiber.Map{"error": "Escrow is not disputed"})
	}
	escrow.ResolvedByID = &userID
	escrow.ResolutionNote = req.Note
	escrow.DisputeStatus = "Resolved"
	if req.Action == "refund" {
		if err := h.setEscrowStatus(&escrow, userID, "Refunded", "Dispute resolved with refund", "", req.Note); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not resolve dispute"})
		}
		h.adjustTrustScore(escrow.SellerID, -5)
	} else {
		if err := h.setEscrowStatus(&escrow, userID, "Released", "Dispute resolved with release", "", req.Note); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Could not resolve dispute"})
		}
		h.adjustTrustScore(escrow.SellerID, 3)
	}
	if err := h.DB.Save(&escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not save resolution"})
	}
	return c.JSON(fiber.Map{"message": "Dispute resolved", "data": escrow})
}

func (h *EscrowHandler) DownloadFinalizedAgreement(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}
	var escrow models.Escrow
	if err := h.DB.Preload("Buyer").Preload("Seller").Preload("Milestones").First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}
	if escrow.Status != "Released" && escrow.Status != "Refunded" {
		return c.Status(400).JSON(fiber.Map{"error": "Escrow must be finalized before export"})
	}
	var b strings.Builder
	b.WriteString("SAFEDEAL FORMAL ESCROW AGREEMENT\n")
	b.WriteString(fmt.Sprintf("Escrow ID: %d\n", escrow.ID))
	b.WriteString(fmt.Sprintf("Status: %s\n", escrow.Status))
	b.WriteString(fmt.Sprintf("Buyer ID: %d\nSeller ID: %d\n", escrow.BuyerID, escrow.SellerID))
	b.WriteString(fmt.Sprintf("Amount: %d ETB\nPlatform Fee: %d ETB\n", escrow.Amount, escrow.PlatformFee))
	b.WriteString(fmt.Sprintf("Conditions: %s\n", escrow.Conditions))
	b.WriteString(fmt.Sprintf("Jurisdiction: %s\nGoverning Law: %s\n", escrow.Jurisdiction, escrow.GoverningLaw))
	b.WriteString(fmt.Sprintf("Dispute Resolution: %s\n", escrow.DisputeResolution))
	b.WriteString(fmt.Sprintf("Blockchain Tx: %s\n", escrow.BlockchainTxHash))
	b.WriteString(fmt.Sprintf("Generated At: %s\n", time.Now().UTC().Format(time.RFC3339)))
	if len(escrow.Milestones) > 0 {
		b.WriteString("\nMilestones:\n")
		for _, m := range escrow.Milestones {
			b.WriteString(fmt.Sprintf("- %s (%d ETB) status=%s\n", m.Title, m.Amount, m.Status))
		}
	}
	c.Set("Content-Type", "text/plain; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=escrow-%d-agreement.txt", escrow.ID))
	return c.SendString(b.String())
}

// CancelEscrow continues...