package handlers

import (
	"errors"
	"log"
	"math/big"
	"strconv"
	"time"

	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type MilestoneHandler struct {
	DB             *gorm.DB
	BlockChainClient *blockchain.Client
}

func NewMilestoneHandler(db *gorm.DB, bc *blockchain.Client) *MilestoneHandler {
	return &MilestoneHandler{DB: db, BlockChainClient: bc}
}

// CreateMilestone creates a new milestone for an escrow
func (h *MilestoneHandler) CreateMilestone(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		EscrowID       uint    `json:"escrow_id" validate:"required"`
		Title          string  `json:"title" validate:"required"`
		Description    string  `json:"description"`
		Amount         uint    `json:"amount" validate:"required,gt=0"`
		DueDate        string  `json:"due_date"`
		OrderIndex     int     `json:"order_index"`
		ApproverID     *uint   `json:"approver_id"` // Optional - can be assigned later
		DeliverableURL *string `json:"deliverable_url"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Check if the user is involved in the escrow (must be buyer)
	var escrow models.Escrow
	result := h.DB.First(&escrow, req.EscrowID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the buyer can create milestones for this escrow"})
	}

	// If no approver is specified, default to buyer
	if req.ApproverID == nil {
		req.ApproverID = &userID
	} else {
		// If an approver is specified, verify they exist
		var approver models.User
		if err := h.DB.First(&approver, *req.ApproverID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(400).JSON(fiber.Map{"error": "Specified approver does not exist"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
	}

	milestone := &models.Milestone{
		EscrowID:       req.EscrowID,
		Title:          req.Title,
		Description:    req.Description,
		Amount:         req.Amount,
		DueDate:        &req.DueDate,
		Status:         models.MilestonePending,
		OrderIndex:     req.OrderIndex,
		ApproverID:     req.ApproverID,
		DeliverableURL: req.DeliverableURL,
	}

	if err := h.DB.Create(milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create milestone"})
	}

	return c.JSON(milestone)
}

// GetMilestone retrieves a specific milestone
func (h *MilestoneHandler) GetMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var milestone models.Milestone
	result := h.DB.Preload("Escrow").Preload("Approver").First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Check if the user is involved in the parent escrow
	if milestone.Escrow.BuyerID != userID && milestone.Escrow.SellerID != userID &&
		(milestone.ApproverID != nil && *milestone.ApproverID != userID) {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
	}

	return c.JSON(milestone)
}

// GetMilestonesByEscrow retrieves all milestones for a specific escrow
func (h *MilestoneHandler) GetMilestonesByEscrow(c *fiber.Ctx) error {
	escrowID, err := strconv.ParseUint(c.Params("escrowId"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid escrow ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Check if the user is involved in the escrow
	var escrow models.Escrow
	result := h.DB.First(&escrow, uint(escrowID))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
	}

	var milestones []models.Milestone
	result = h.DB.Preload("Approver").Where("escrow_id = ?", escrowID).Order("order_index ASC").Find(&milestones)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(milestones)
}

// UpdateMilestone updates a milestone's details
func (h *MilestoneHandler) UpdateMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var milestone models.Milestone
	result := h.DB.First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Only the buyer can update milestone details
	var escrow models.Escrow
	result = h.DB.First(&escrow, milestone.EscrowID)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if escrow.BuyerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the buyer can update milestone details"})
	}

	var req struct {
		Title          *string `json:"title"`
		Description    *string `json:"description"`
		DueDate        *string `json:"due_date"`
		OrderIndex     *int    `json:"order_index"`
		ApproverID     *uint   `json:"approver_id"`
		DeliverableURL *string `json:"deliverable_url"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates := make(map[string]interface{})

	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.DueDate != nil {
		updates["due_date"] = *req.DueDate
	}
	if req.OrderIndex != nil {
		updates["order_index"] = *req.OrderIndex
	}
	if req.ApproverID != nil {
		// Verify the new approver exists
		var approver models.User
		if err := h.DB.First(&approver, *req.ApproverID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(400).JSON(fiber.Map{"error": "Specified approver does not exist"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		updates["approver_id"] = *req.ApproverID
	}
	if req.DeliverableURL != nil {
		updates["deliverable_url"] = req.DeliverableURL
	}

	if err := h.DB.Model(&milestone).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update milestone"})
	}

	// Reload the updated milestone
	h.DB.Preload("Approver").First(&milestone, uint(id))

	return c.JSON(milestone)
}

// SubmitMilestone marks a milestone as submitted for approval
func (h *MilestoneHandler) SubmitMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var milestone models.Milestone
	result := h.DB.Preload("Escrow").First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Only the seller can submit the milestone
	if milestone.Escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the seller can submit the milestone"})
	}

	if milestone.Status != models.MilestoneFunded {
		return c.Status(400).JSON(fiber.Map{"error": "Milestone must be funded before submission"})
	}

	// Log to blockchain for audit trail (court compliance)
	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		escrowID := big.NewInt(int64(milestone.EscrowID))
		milestoneID := big.NewInt(int64(milestone.ID))
		tx, err := h.BlockChainClient.LogMilestoneSubmitted(escrowID, milestoneID)
		if err != nil {
			log.Printf("Failed to log MilestoneSubmitted to blockchain for milestone %d: %v", milestone.ID, err)
		} else {
			log.Printf("Successfully logged MilestoneSubmitted to blockchain with TX: %v", tx.Hash().Hex())
		}
	}

	// Use ISO 8601 format for consistency
	now := time.Now().Format(time.RFC3339)
	milestone.Status = models.MilestoneSubmitted
	milestone.SubmittedAt = &now

	if err := h.DB.Save(&milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update milestone"})
	}

	return c.JSON(fiber.Map{"message": "Milestone submitted successfully", "milestone": milestone})
}

// ApproveMilestone marks a milestone as approved
func (h *MilestoneHandler) ApproveMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var milestone models.Milestone
	result := h.DB.Preload("Escrow").First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Only the designated approver can approve the milestone
	if milestone.ApproverID == nil || *milestone.ApproverID != userID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Only the designated approver can approve this milestone",
		})
	}

	if milestone.Status != models.MilestoneSubmitted {
		return c.Status(400).JSON(fiber.Map{"error": "Milestone must be submitted before it can be approved"})
	}

	now := time.Now().Format(time.RFC3339)
	milestone.Status = models.MilestoneApproved
	milestone.ApprovedAt = &now
	
	// Log APPROVAL to blockchain (court critical)
	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		escrowID := big.NewInt(int64(milestone.EscrowID))
		milestoneID := big.NewInt(int64(milestone.ID))
		tx, err := h.BlockChainClient.LogMilestoneApproved(escrowID, milestoneID)
		if err != nil {
			log.Printf("Failed to log MilestoneApproved to blockchain for milestone %d: %v", milestone.ID, err)
		} else {
			log.Printf("Successfully logged MilestoneApproved to blockchain with TX: %v", tx.Hash().Hex())
		}
	}

	if err := h.DB.Save(&milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update milestone"})
	}

	return c.JSON(fiber.Map{"message": "Milestone approved successfully", "milestone": milestone})
}

// RejectMilestone marks a milestone as rejected
func (h *MilestoneHandler) RejectMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var milestone models.Milestone
	result := h.DB.Preload("Escrow").First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Only the designated approver can reject the milestone
	if milestone.ApproverID == nil || *milestone.ApproverID != userID {
		return c.Status(403).JSON(fiber.Map{
			"error": "Only the designated approver can reject this milestone",
		})
	}

	if milestone.Status != models.MilestoneSubmitted {
		return c.Status(400).JSON(fiber.Map{"error": "Milestone must be submitted before it can be rejected"})
	}

	milestone.Status = models.MilestoneRejected
	
	// Log REJECTION to blockchain
	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		escrowID := big.NewInt(int64(milestone.EscrowID))
		milestoneID := big.NewInt(int64(milestone.ID))
		tx, err := h.BlockChainClient.LogMilestoneRejected(escrowID, milestoneID)
		if err != nil {
			log.Printf("Failed to log MilestoneRejected to blockchain for milestone %d: %v", milestone.ID, err)
		} else {
			log.Printf("Successfully logged MilestoneRejected to blockchain with TX: %v", tx.Hash().Hex())
		}
	}

	if err := h.DB.Save(&milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update milestone"})
	}

	return c.JSON(fiber.Map{"message": "Milestone rejected", "milestone": milestone})
}
