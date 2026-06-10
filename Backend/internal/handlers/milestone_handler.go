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
	DB               *gorm.DB
	BlockChainClient *blockchain.Client
}

func NewMilestoneHandler(db *gorm.DB, bc *blockchain.Client) *MilestoneHandler {
	return &MilestoneHandler{DB: db, BlockChainClient: bc}
}

// GetMilestonesByEscrow returns all milestones for a specific escrow
func (h *MilestoneHandler) GetMilestonesByEscrow(c *fiber.Ctx) error {
	escrowID, err := strconv.ParseUint(c.Params("escrowId"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid escrow ID"})
	}

	var milestones []models.Milestone
	result := h.DB.Where("escrow_id = ?", uint(escrowID)).Preload("Approver").Find(&milestones)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(milestones)
}

// CreateMilestone creates a new milestone for an escrow
func (h *MilestoneHandler) CreateMilestone(c *fiber.Ctx) error {
	var req struct {
		EscrowID              uint                         `json:"escrow_id"`
		Title                 string                       `json:"title"`
		Description           string                       `json:"description"`
		Amount                uint                         `json:"amount"`
		DueDate               *string                      `json:"due_date"`
		OrderIndex            int                          `json:"order_index"`
		ApproverID            *uint                        `json:"approver_id"`
		CompletionType        models.CompletionType        `json:"completion_type"`
		VerificationAuthority models.VerificationAuthority `json:"verification_authority"`
		ReleaseTrigger        models.ReleaseTrigger        `json:"release_trigger"`
		EvidenceTypes         []string                     `json:"evidence_types"`
		AutoAcceptDays        int                          `json:"auto_accept_days"`
		InspectionPeriodDays  int                          `json:"inspection_period_days"`
		RequiredApprovals     int                          `json:"required_approvals"`
		AcceptanceCriteria    string                       `json:"acceptance_criteria"`
		RejectionConditions   string                       `json:"rejection_conditions"`
		CureTerms             string                       `json:"cure_terms"`
		RevisionWindow        int                          `json:"revision_window"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	evidenceTypesStr := ""
	if len(req.EvidenceTypes) > 0 {
		for i, et := range req.EvidenceTypes {
			if i > 0 { evidenceTypesStr += "," }
			evidenceTypesStr += et
		}
	}

	milestone := models.Milestone{
		EscrowID:              req.EscrowID,
		Title:                 req.Title,
		Description:           req.Description,
		Amount:                req.Amount,
		DueDate:               req.DueDate,
		OrderIndex:            req.OrderIndex,
		ApproverID:            req.ApproverID,
		CompletionType:        req.CompletionType,
		VerificationAuthority: req.VerificationAuthority,
		ReleaseTrigger:        req.ReleaseTrigger,
		EvidenceTypes:         evidenceTypesStr,
		AutoAcceptDays:        req.AutoAcceptDays,
		InspectionPeriodDays:  req.InspectionPeriodDays,
		RequiredApprovals:     req.RequiredApprovals,
		AcceptanceCriteria:    req.AcceptanceCriteria,
		RejectionConditions:   req.RejectionConditions,
		CureTerms:             req.CureTerms,
		RevisionWindow:        req.RevisionWindow,
		Status:                models.MilestonePending,
	}

	if err := h.DB.Create(&milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create milestone"})
	}

	return c.Status(201).JSON(milestone)
}

// GetMilestoneByID returns a specific milestone
func (h *MilestoneHandler) GetMilestoneByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	var milestone models.Milestone
	result := h.DB.Preload("Approver").First(&milestone, uint(id))
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(milestone)
}

// UpdateMilestone updates a milestone
func (h *MilestoneHandler) UpdateMilestone(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid milestone ID"})
	}

	var milestone models.Milestone
	if err := h.DB.First(&milestone, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
	}

	var req struct {
		Title                 string                       `json:"title"`
		Description           string                       `json:"description"`
		Amount                uint                         `json:"amount"`
		DueDate               *string                      `json:"due_date"`
		OrderIndex            int                          `json:"order_index"`
		ApproverID            *uint                        `json:"approver_id"`
		CompletionType        models.CompletionType        `json:"completion_type"`
		VerificationAuthority models.VerificationAuthority `json:"verification_authority"`
		ReleaseTrigger        models.ReleaseTrigger        `json:"release_trigger"`
		EvidenceTypes         []string                     `json:"evidence_types"`
		AutoAcceptDays        int                          `json:"auto_accept_days"`
		InspectionPeriodDays  int                          `json:"inspection_period_days"`
		RequiredApprovals     int                          `json:"required_approvals"`
		AcceptanceCriteria    string                       `json:"acceptance_criteria"`
		RejectionConditions   string                       `json:"rejection_conditions"`
		CureTerms             string                       `json:"cure_terms"`
		RevisionWindow        int                          `json:"revision_window"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Title != "" { milestone.Title = req.Title }
	if req.Description != "" { milestone.Description = req.Description }
	if req.Amount > 0 { milestone.Amount = req.Amount }
	if req.DueDate != nil { milestone.DueDate = req.DueDate }
	milestone.OrderIndex = req.OrderIndex
	if req.ApproverID != nil { milestone.ApproverID = req.ApproverID }
	if req.CompletionType != "" { milestone.CompletionType = req.CompletionType }
	if req.VerificationAuthority != "" { milestone.VerificationAuthority = req.VerificationAuthority }
	if req.ReleaseTrigger != "" { milestone.ReleaseTrigger = req.ReleaseTrigger }
	
	if len(req.EvidenceTypes) > 0 {
		evidenceTypesStr := ""
		for i, et := range req.EvidenceTypes {
			if i > 0 { evidenceTypesStr += "," }
			evidenceTypesStr += et
		}
		milestone.EvidenceTypes = evidenceTypesStr
	}

	if req.AutoAcceptDays > 0 { milestone.AutoAcceptDays = req.AutoAcceptDays }
	if req.InspectionPeriodDays > 0 { milestone.InspectionPeriodDays = req.InspectionPeriodDays }
	if req.RequiredApprovals > 0 { milestone.RequiredApprovals = req.RequiredApprovals }
	if req.AcceptanceCriteria != "" { milestone.AcceptanceCriteria = req.AcceptanceCriteria }
	if req.RejectionConditions != "" { milestone.RejectionConditions = req.RejectionConditions }
	if req.CureTerms != "" { milestone.CureTerms = req.CureTerms }
	if req.RevisionWindow > 0 { milestone.RevisionWindow = req.RevisionWindow }

	if err := h.DB.Save(&milestone).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not update milestone"})
	}

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

	if milestone.Status != models.MilestoneFunded && milestone.Status != models.MilestonePending {
		return c.Status(400).JSON(fiber.Map{"error": "Milestone must be funded or pending before submission"})
	}

	// Log to blockchain for audit trail (court compliance)
	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		escrowID := big.NewInt(int64(milestone.EscrowID))
		milestoneID := big.NewInt(int64(milestone.ID))
		
		// Log the milestone submission event
		tx, err := h.BlockChainClient.LogMilestoneSubmitted(escrowID, milestoneID)
		if err != nil {
			log.Printf("Failed to log MilestoneSubmitted to blockchain for milestone %d: %v", milestone.ID, err)
		} else if tx != nil {
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

// Helper function to generate hash for blockchain recording
func (h *MilestoneHandler) generateHash(data string) string {
	return "0x" + data[:min(len(data), 32)]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
