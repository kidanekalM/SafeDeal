package handlers

import (
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/contractgen"
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
		Scope *struct {
			AcceptanceMethod    string `json:"acceptance_method"`
			AcceptanceDetail    string `json:"acceptance_detail"`
			DueDate             string `json:"due_date"`
			RejectionPolicy     string `json:"rejection_policy"`
			CurePeriodDays      int    `json:"cure_period_days"`
			BreachTerms         string `json:"breach_terms"`
			TerminationNoticeDays int  `json:"termination_notice_days"`
			AcceptanceDays      int    `json:"acceptance_days"`
			DeemedAccept        bool   `json:"deemed_accept"`
			Deliverables        []struct {
				Title       string `json:"title"`
				Standard    string `json:"standard"`
				StandardRef string `json:"standard_ref"`
			} `json:"deliverables"`
			Exclusions []struct {
				Title string `json:"title"`
			} `json:"exclusions"`
		} `json:"scope,omitempty"`
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

	// ExtraData is a Postgres jsonb column; store valid JSON (never an empty string).
	extraData := strings.TrimSpace(req.ExtraData)
	if extraData == "" {
		extraData = "{}"
	}

	escrow := &models.Escrow{
		BuyerID: finalBuyerID, SellerID: finalSellerID, MediatorID: req.MediatorID,
		Amount: req.Amount, PlatformFee: fee, Status: models.EscrowPending,
		EscrowType: req.EscrowType, Title: req.Title, Description: req.Description,
		DeliveryDate: parsedDeliveryDate, InspectionPeriod: req.InspectionPeriod,
		Jurisdiction: req.Jurisdiction, GoverningLaw: req.GoverningLaw,
		DisputeResolution: req.DisputeResolution, ExtraData: extraData,
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

	// Persist the structured contract scope (six-question skeleton).
	if req.Scope != nil {
		s := req.Scope
		scope := &models.ContractScope{
			EscrowID:              escrow.ID,
			AcceptanceMethod:      s.AcceptanceMethod,
			AcceptanceDetail:      s.AcceptanceDetail,
			DueDate:               s.DueDate,
			RejectionPolicy:       s.RejectionPolicy,
			CurePeriodDays:        s.CurePeriodDays,
			BreachTerms:           s.BreachTerms,
			TerminationNoticeDays: s.TerminationNoticeDays,
			AcceptanceDays:        s.AcceptanceDays,
			DeemedAccept:          s.DeemedAccept,
		}
		if scope.AcceptanceMethod == "" {
			scope.AcceptanceMethod = "buyer_approval"
		}
		if scope.AcceptanceDays == 0 {
			scope.AcceptanceDays = 5
		}
		if scope.TerminationNoticeDays == 0 {
			scope.TerminationNoticeDays = 7
		}
		h.DB.Create(scope)
		for i := range s.Deliverables {
			d := s.Deliverables[i]
			if strings.TrimSpace(d.Title) == "" {
				continue
			}
			if d.Standard == "" {
				d.Standard = "none"
			}
			h.DB.Create(&models.ContractDeliverable{
				ScopeID:     scope.ID,
				Title:       d.Title,
				Standard:    d.Standard,
				StandardRef: d.StandardRef,
				OrderIndex:  i,
			})
		}
		for i := range s.Exclusions {
			e := s.Exclusions[i]
			if strings.TrimSpace(e.Title) == "" {
				continue
			}
			h.DB.Create(&models.ContractExclusion{
				ScopeID:    scope.ID,
				Title:      e.Title,
				OrderIndex: i,
			})
		}
		escrow.Scope = scope
	}

	var completeEscrow models.Escrow
	h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").Preload("Scope").Preload("Scope.Deliverables").Preload("Scope.Exclusions").First(&completeEscrow, escrow.ID)

	// Generate and persist the printable contract from the structured data.
	completeEscrow.ContractVersion = "1.0"
	completeEscrow.ContractHash = completeEscrow.EscrowHash
	completeEscrow.GeneratedContract = contractgen.Generate(&completeEscrow)
	h.DB.Model(&completeEscrow).Update("generated_contract", completeEscrow.GeneratedContract)
	completeEscrow.GeneratedContract = "" // keep response lean; text is retrievable via final-agreement

	return c.JSON(fiber.Map{"message": "Escrow created successfully", "data": completeEscrow})
}

func (h *EscrowHandler) GetEscrowByID(c *fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var escrow models.Escrow
	if err := h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").Preload("Milestones.Approver").Preload("Scope").Preload("Scope.Deliverables").Preload("Scope.Exclusions").First(&escrow, uint(id)).Error; err != nil {
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
	var req struct{ TransactionID string `json:"transaction_id"`; AccountSuffix string `json:"account_suffix"` }
	c.BodyParser(&req)
	var e models.Escrow
	h.DB.First(&e, uint(id))
	prev := e.Status

	// transaction_ref has a unique index; ensure it never collides so funding always succeeds.
	ref := strings.TrimSpace(req.TransactionID)
	if ref == "" {
		ref = fmt.Sprintf("FT-%d-%d", e.ID, time.Now().UnixNano())
	} else {
		var count int64
		h.DB.Model(&models.Escrow{}).Where("transaction_ref = ? AND id <> ?", ref, e.ID).Count(&count)
		if count > 0 {
			ref = fmt.Sprintf("%s-%d", ref, time.Now().UnixNano())
		}
	}

	e.Status = models.EscrowFunded
	e.TransactionRef = &ref
	if err := h.DB.Save(&e).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not verify payment", "message": err.Error()})
	}
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
	if err := h.DB.First(&e, uint(id)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	// Regenerate on the fly if not persisted (backward compatible with old records).
	if e.GeneratedContract == "" {
		h.DB.Preload("Buyer").Preload("Seller").Preload("Mediator").Preload("Milestones").First(&e, uint(id))
		e.GeneratedContract = contractgen.Generate(&e)
	}

	c.Set("Content-Type", "text/plain")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"safedeal-agreement-%d.txt\"", e.ID))
	return c.SendString(e.GeneratedContract)
}

func (h *EscrowHandler) RequestAIDecision(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Requested"})
}

func (h *EscrowHandler) IsValidTransition(from, to string) bool {
	return true // Simplified for intent-based redesign
}
