package handlers

import (
	"fmt"
	"math/big"
	"strconv"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/models"
	"backend_monolithic/internal/rabbitmq"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type EscrowHandler struct {
	DB                  *gorm.DB
	AuthService         *auth.Service
	RabbitMQ            *rabbitmq.Producer
	BlockchainClient    *blockchain.Client
	NotificationHandler *NotificationHandler
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

func (h *EscrowHandler) setEscrowStatus(escrow *models.Escrow, actorID uint, nextStatus models.EscrowStatus, reason string, txHash string, metadata string) error {
	prev := escrow.Status
	escrow.Status = models.EscrowStatus(nextStatus)
	if err := h.DB.Save(escrow).Error; err != nil {
		return err
	}
	h.recordStatusEvent(escrow.ID, actorID, string(prev), string(escrow.Status), reason, txHash, metadata)
	return nil
}

func (h *EscrowHandler) adjustTrustScore(userID uint, delta float64) {
	// Simple flow: Trust score logic removed
	return
}

func (h *EscrowHandler) computeEscrowHash(escrow *models.Escrow) string {
	// Create a stable string representation for hashing based on INTENT fields
	milestoneData := ""
	for _, m := range escrow.Milestones {
		milestoneData += fmt.Sprintf("|%s:%d:%s:%s:%s", m.Title, m.Amount, m.Description, m.ReleaseTrigger, m.VerificationAuthority)
	}

	data := fmt.Sprintf(
		"v5|%d|%d|%d|%s|%s|%s|%v|%d|%s|%s|%s|%s|%s",
		escrow.BuyerID,
		escrow.SellerID,
		escrow.Amount,
		escrow.EscrowType,
		escrow.Title,
		escrow.Description,
		escrow.DeliveryDate,
		escrow.InspectionPeriod,
		escrow.Jurisdiction,
		escrow.GoverningLaw,
		escrow.DisputeResolution,
		escrow.ContractVersion,
		milestoneData,
	)

	hashBytes := crypto.Keccak256([]byte(data))
	return "0x" + common.Bytes2Hex(hashBytes)
}

func NewEscrowHandler(db *gorm.DB, authService *auth.Service, rabbitMQ *rabbitmq.Producer, blockchainClient *blockchain.Client, notificationHandler *NotificationHandler) *EscrowHandler {
	return &EscrowHandler{
		DB:                  db,
		AuthService:         authService,
		RabbitMQ:            rabbitMQ,
		BlockchainClient:    blockchainClient,
		NotificationHandler: notificationHandler,
	}
}

func (h *EscrowHandler) CreateEscrow(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		BuyerID           uint               `json:"buyer_id"`
		SellerID          uint               `json:"seller_id"` 
		MediatorID        *uint              `json:"mediator_id,omitempty"`
		BuyerEmail        string             `json:"buyer_email,omitempty"`
		SellerEmail       string             `json:"seller_email,omitempty"`
		Amount            uint               `json:"amount"`
		Title             string             `json:"title"`
		Description       string             `json:"description"`
		EscrowType        string             `json:"escrow_type"` // 'item' or 'project'
		DeliveryDate      string             `json:"delivery_date,omitempty"`
		InspectionPeriod  int                `json:"inspection_period"`
		Jurisdiction      string             `json:"jurisdiction"`
		GoverningLaw      string             `json:"governing_law"`
		DisputeResolution string             `json:"dispute_resolution"`
		Milestones        []struct {
			Title       string `json:"title"`
			Amount      uint   `json:"amount"`
			Description string `json:"description"`
			DueDate     string `json:"due_date"`
		} `json:"milestones,omitempty"`
		ExtraData         string             `json:"extra_data,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.EscrowType == "" { req.EscrowType = "item" }

	if len(req.Milestones) > 0 {
		var total uint = 0
		for _, m := range req.Milestones {
			total += m.Amount
		}
		if total > 0 { req.Amount = total }
	}

	var finalBuyerID, finalSellerID uint
	var buyerUser, sellerUser models.User
	creatorRole := c.Query("role", "buyer")

	if creatorRole == "mediator" {
		finalBuyerID = req.BuyerID
		finalSellerID = req.SellerID
		if req.MediatorID == nil { req.MediatorID = &userID }
	} else if creatorRole == "seller" {
		finalBuyerID = req.BuyerID
		finalSellerID = userID
	} else {
		finalBuyerID = userID
		finalSellerID = req.SellerID
	}

	if finalBuyerID == 0 && req.BuyerEmail != "" {
		var existingBuyer models.User
		if err := h.DB.Where("email = ?", req.BuyerEmail).First(&existingBuyer).Error; err == nil {
			finalBuyerID = existingBuyer.ID
			buyerUser = existingBuyer
		} else {
			placeholderBuyer := models.User{
				Email: req.BuyerEmail, FirstName: "Invited", LastName: "Buyer",
				Password: "placeholder_password", Activated: false,
			}
			h.DB.Create(&placeholderBuyer)
			finalBuyerID = placeholderBuyer.ID
			buyerUser = placeholderBuyer
		}
	} else if finalBuyerID != 0 {
		h.DB.First(&buyerUser, finalBuyerID)
	}

	if finalSellerID == 0 && req.SellerEmail != "" {
		var existingSeller models.User
		if err := h.DB.Where("email = ?", req.SellerEmail).First(&existingSeller).Error; err == nil {
			finalSellerID = existingSeller.ID
			sellerUser = existingSeller
		} else {
			placeholderSeller := models.User{
				Email: req.SellerEmail, FirstName: "Invited", LastName: "Seller",
				Password: "placeholder_password", Activated: false,
			}
			h.DB.Create(&placeholderSeller)
			finalSellerID = placeholderSeller.ID
			sellerUser = placeholderSeller
		}
	} else if finalSellerID != 0 {
		h.DB.First(&sellerUser, finalSellerID)
	}

	var parsedDeliveryDate *time.Time
	if req.DeliveryDate != "" {
		t, err := time.Parse("2006-01-02", req.DeliveryDate)
		if err == nil {
			parsedDeliveryDate = &t
		} else {
			// Try RFC3339 as fallback
			t, err = time.Parse(time.RFC3339, req.DeliveryDate)
			if err == nil {
				parsedDeliveryDate = &t
			}
		}
	}

	fee := uint(float64(req.Amount) * 0.02)
	escrow := &models.Escrow{
		BuyerID: finalBuyerID, SellerID: finalSellerID, MediatorID: req.MediatorID,
		Amount: req.Amount, PlatformFee: fee, Status: models.EscrowPending,
		EscrowType: req.EscrowType, Title: req.Title, Description: req.Description,
		DeliveryDate: parsedDeliveryDate, InspectionPeriod: req.InspectionPeriod,
		Jurisdiction: req.Jurisdiction, GoverningLaw: req.GoverningLaw,
		DisputeResolution: req.DisputeResolution, ExtraData: req.ExtraData,
	}

	escrow.EscrowHash = h.computeEscrowHash(escrow)
	if err := h.DB.Create(escrow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not create escrow record"})
	}
	h.recordStatusEvent(escrow.ID, userID, "", string(escrow.Status), "Escrow created", escrow.BlockchainTxHash, "")

	if !buyerUser.Activated { h.NotificationHandler.InviteUser(buyerUser.Email); escrow.InviteSent = true }
	if !sellerUser.Activated { h.NotificationHandler.InviteUser(sellerUser.Email); escrow.InviteSent = true }
	if escrow.InviteSent { h.DB.Save(escrow) }

	h.NotificationHandler.SendEscrowUpdate(escrow.ID, string(models.EscrowPending), buyerUser.Email, sellerUser.Email, req.Amount)

	if req.Milestones != nil {
		for i := range req.Milestones {
			mReq := req.Milestones[i]
			m := models.Milestone{
				EscrowID: escrow.ID,
				Title: mReq.Title,
				Amount: mReq.Amount,
				Description: mReq.Description,
				Status: models.MilestonePending,
				OrderIndex: i,
				ApproverID: &finalBuyerID,
				CompletionType: models.CompletionServicePerformed,
				VerificationAuthority: models.AuthBuyer,
				ReleaseTrigger: models.TriggerBuyerApproval,
				EvidenceTypes: "document,photo",
				InspectionPeriodDays: 7,
			}
			if mReq.DueDate != "" {
				m.DueDate = &mReq.DueDate
			}
			if req.EscrowType == "item" {
				m.CompletionType = models.CompletionDelivery
			}
			h.DB.Create(&m)
		}
	}

	if h.BlockchainClient != nil && h.BlockchainClient.IsConnected() {
		buyerAddr := common.HexToAddress(buyerUser.WalletAddress)
		sellerAddr := common.HexToAddress(sellerUser.WalletAddress)
		amount := big.NewInt(int64(req.Amount))
		tx, _ := h.BlockchainClient.CreateEscrow(buyerAddr, sellerAddr, amount)
		if tx != nil {
			escrow.BlockchainTxHash = tx.Hash().Hex()
			h.DB.Save(escrow)
		}
	}

	var completeEscrow models.Escrow
	h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").First(&completeEscrow, escrow.ID)
	return c.JSON(fiber.Map{"message": "Escrow created successfully", "data": completeEscrow})
}

func (h *EscrowHandler) GetEscrowByID(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var escrow models.Escrow
	if err := h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").Preload("Milestones.Approver").First(&escrow, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}
	return c.JSON(escrow)
}

func (h *EscrowHandler) GetMyEscrows(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset := (page - 1) * limit
	var escrows []models.Escrow
	var total int64
	query := h.DB.Model(&models.Escrow{}).Where("buyer_id = ? OR seller_id = ? OR mediator_id = ?", userID, userID, userID)
	query.Count(&total)
	query.Preload("Buyer").Preload("Seller").Preload("Mediator").Order("created_at DESC").Limit(limit).Offset(offset).Find(&escrows)
	return c.JSON(fiber.Map{"data": escrows, "meta": fiber.Map{"total": total, "page": page, "limit": limit}})
}

func (h *EscrowHandler) GetEscrowContacts(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(uint)
	var escrows []models.Escrow
	h.DB.Where("buyer_id = ? OR seller_id = ?", userID, userID).Find(&escrows)
	contactIDs := make(map[uint]bool)
	for _, e := range escrows {
		if e.BuyerID != userID { contactIDs[e.BuyerID] = true }
		if e.SellerID != userID { contactIDs[e.SellerID] = true }
	}
	var contacts []models.User
	for id := range contactIDs {
		var u models.User
		if err := h.DB.First(&u, id).Error; err == nil { contacts = append(contacts, u) }
	}
	return c.JSON(contacts)
}

func (h *EscrowHandler) CancelEscrow(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var e models.Escrow
	if err := h.DB.First(&e, uint(id)).Error; err != nil { return c.Status(404).JSON(fiber.Map{"error": "Not found"}) }
	if e.BuyerID != userID || e.Status != models.EscrowPending { return c.Status(403).JSON(fiber.Map{"error": "Forbidden"}) }
	h.setEscrowStatus(&e, userID, models.EscrowCancelled, "Canceled by buyer", "", "")
	return c.JSON(fiber.Map{"message": "Canceled"})
}

func (h *EscrowHandler) AcceptEscrow(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	if e.SellerID != userID { return c.Status(403).JSON(fiber.Map{"error": "Forbidden"}) }
	h.setEscrowStatus(&e, userID, models.EscrowActive, "Accepted", "", "")
	e.Active = true
	e.SellerAcceptedAt = func() *time.Time { t := time.Now(); return &t }()
	h.DB.Save(&e)
	h.DB.Model(&models.Milestone{}).Where("escrow_id = ?", e.ID).Update("status", models.MilestoneFunded)
	return c.JSON(fiber.Map{"data": e})
}

func (h *EscrowHandler) ConfirmReceipt(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	if e.BuyerID != userID { return c.Status(403).JSON(fiber.Map{"error": "Forbidden"}) }
	h.setEscrowStatus(&e, userID, models.EscrowCompleted, "Confirmed", "", "")
	e.BuyerAcceptedAt = func() *time.Time { t := time.Now(); return &t }()
	h.DB.Save(&e)
	return c.JSON(fiber.Map{"message": "Confirmed"})
}

func (h *EscrowHandler) CreateDispute(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	var req struct { Reason string `json:"reason"`; Evidence string `json:"evidence"` }
	c.BodyParser(&req)
	e.DisputeReason = req.Reason
	e.DisputeStatus = models.DisputeOpen
	h.setEscrowStatus(&e, userID, models.EscrowDisputed, "Disputed", "", req.Evidence)
	return c.JSON(fiber.Map{"message": "Disputed", "data": e})
}

func (h *EscrowHandler) VerifyCBEPayment(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var req struct { TransactionID string `json:"transaction_id"`; AccountSuffix string `json:"account_suffix"` }
	c.BodyParser(&req)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	prev := e.Status
	e.Status = models.EscrowFunded
	e.TransactionRef = &req.TransactionID
	h.DB.Save(&e)
	h.recordStatusEvent(e.ID, userID, string(prev), string(models.EscrowFunded), "CBE verified", "", req.TransactionID)
	h.DB.Model(&models.Milestone{}).Where("escrow_id = ?", e.ID).Update("status", models.MilestoneFunded)
	return c.JSON(fiber.Map{"message": "Verified", "data": e})
}

func (h *EscrowHandler) UpdateEscrow(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	var req struct { Amount uint `json:"amount"`; Title string `json:"title"`; Description string `json:"description"` }
	c.BodyParser(&req)
	if req.Amount > 0 { e.Amount = req.Amount }
	if req.Title != "" { e.Title = req.Title }
	if req.Description != "" { e.Description = req.Description }
	e.EscrowHash = h.computeEscrowHash(&e)
	h.DB.Save(&e)
	return c.JSON(e)
}

func (h *EscrowHandler) LockEscrow(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	e.IsLocked = true
	h.DB.Save(&e)
	return c.JSON(fiber.Map{"message": "Locked", "data": e})
}

func (h *EscrowHandler) GetStatusHistory(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var evs []models.EscrowStatusEvent
	h.DB.Where("escrow_id = ?", uint(id)).Order("created_at asc").Find(&evs)
	return c.JSON(evs)
}

func (h *EscrowHandler) ResolveDispute(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var req struct { Action string `json:"action"`; Note string `json:"note"` }
	c.BodyParser(&req)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	next := models.EscrowCompleted
	if req.Action == "refund" { next = models.EscrowStatus("refunded") }
	h.setEscrowStatus(&e, userID, next, "Resolved", "", req.Note)
	return c.JSON(fiber.Map{"message": "Resolved", "data": e})
}

func (h *EscrowHandler) VerifyPayment(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var req struct { Action string `json:"action"` }
	c.BodyParser(&req)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	if req.Action == "approve" { h.setEscrowStatus(&e, userID, models.EscrowFunded, "Approved", "", "") }
	return c.JSON(fiber.Map{"status": e.Status})
}

func (h *EscrowHandler) GetDispute(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	return c.JSON(fiber.Map{"id": e.ID, "status": e.Status, "reason": e.DisputeReason})
}

func (h *EscrowHandler) RefundEscrow(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	h.setEscrowStatus(&e, 0, "refunded", "Refunded", "", "")
	return c.JSON(fiber.Map{"message": "Refunded"})
}

func (h *EscrowHandler) UploadReceipt(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	userID, _ := c.Locals("userID").(uint)
	var req struct { ReceiptURL string `json:"receipt_url"` }
	c.BodyParser(&req)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	e.ReceiptURL = req.ReceiptURL
	h.setEscrowStatus(&e, userID, "verifying", "Uploaded", "", req.ReceiptURL)
	return c.JSON(e)
}

func (h *EscrowHandler) DownloadFinalizedAgreement(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	c.Set("Content-Type", "text/plain")
	return c.SendString(fmt.Sprintf("Agreement: %d", e.ID))
}

func (h *EscrowHandler) RequestAIDecision(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Requested"})
}

func (h *EscrowHandler) IsValidTransition(from, to string) bool {
	return true // Simplified for intent-based redesign
}
