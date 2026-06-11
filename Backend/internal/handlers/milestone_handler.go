package handlers

import (
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

func (h *MilestoneHandler) GetMilestonesByEscrow(c *fiber.Ctx) error {
	escrowID, _ := strconv.ParseUint(c.Params("escrowId"), 10, 32)
	var milestones []models.Milestone
	h.DB.Where("escrow_id = ?", uint(escrowID)).Preload("Approver").Find(&milestones)
	return c.JSON(milestones)
}

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
	}

	c.BodyParser(&req)

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
		Status:                models.MilestonePending,
	}

	h.DB.Create(&milestone)
	return c.Status(201).JSON(milestone)
}

func (h *MilestoneHandler) GetMilestoneByID(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var milestone models.Milestone
	if err := h.DB.Preload("Approver").First(&milestone, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
	}
	return c.JSON(milestone)
}

func (h *MilestoneHandler) UpdateMilestone(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var milestone models.Milestone
	if err := h.DB.First(&milestone, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Milestone not found"})
	}

	var req struct {
		Title                 string                       `json:"title"`
		Description           string                       `json:"description"`
		Amount                uint                         `json:"amount"`
		DueDate               *string                      `json:"due_date"`
		CompletionType        models.CompletionType        `json:"completion_type"`
		VerificationAuthority models.VerificationAuthority `json:"verification_authority"`
		ReleaseTrigger        models.ReleaseTrigger        `json:"release_trigger"`
	}
	c.BodyParser(&req)

	if req.Title != "" { milestone.Title = req.Title }
	if req.Description != "" { milestone.Description = req.Description }
	if req.Amount > 0 { milestone.Amount = req.Amount }
	if req.DueDate != nil { milestone.DueDate = req.DueDate }
	if req.CompletionType != "" { milestone.CompletionType = req.CompletionType }
	if req.VerificationAuthority != "" { milestone.VerificationAuthority = req.VerificationAuthority }
	if req.ReleaseTrigger != "" { milestone.ReleaseTrigger = req.ReleaseTrigger }

	h.DB.Save(&milestone)
	return c.JSON(milestone)
}

func (h *MilestoneHandler) SubmitMilestone(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)

	var milestone models.Milestone
	h.DB.Preload("Escrow").First(&milestone, uint(id))

	if milestone.Escrow.SellerID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Only the seller can submit"})
	}

	now := time.Now().Format(time.RFC3339)
	milestone.Status = models.MilestoneSubmitted
	milestone.SubmittedAt = &now
	h.DB.Save(&milestone)

	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		h.BlockChainClient.LogMilestoneSubmitted(big.NewInt(int64(milestone.EscrowID)), big.NewInt(int64(milestone.ID)))
	}

	return c.JSON(fiber.Map{"message": "Milestone submitted", "milestone": milestone})
}

func (h *MilestoneHandler) ApproveMilestone(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)

	var milestone models.Milestone
	h.DB.Preload("Escrow").First(&milestone, uint(id))

	if milestone.ApproverID != nil && *milestone.ApproverID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized approver"})
	}

	now := time.Now().Format(time.RFC3339)
	milestone.Status = models.MilestoneApproved
	milestone.ApprovedAt = &now
	h.DB.Save(&milestone)
	
	if h.BlockChainClient != nil && h.BlockChainClient.IsConnected() {
		h.BlockChainClient.LogMilestoneApproved(big.NewInt(int64(milestone.EscrowID)), big.NewInt(int64(milestone.ID)))
	}

	return c.JSON(fiber.Map{"message": "Milestone approved", "milestone": milestone})
}

func (h *MilestoneHandler) RejectMilestone(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var milestone models.Milestone
	h.DB.Preload("Escrow").First(&milestone, uint(id))
	if milestone.ApproverID != nil && *milestone.ApproverID != userID { return c.Status(403).JSON(fiber.Map{"error": "Unauthorized"}) }
	milestone.Status = models.MilestoneRejected
	h.DB.Save(&milestone)
	return c.JSON(fiber.Map{"message": "Milestone rejected", "milestone": milestone})
}
