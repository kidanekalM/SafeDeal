package models

import (
	"time"

	"gorm.io/gorm"
)

type Escrow struct {
	gorm.Model
	ID                 uint        `json:"id" gorm:"primaryKey"`
	BuyerID            uint        `json:"buyer_id" gorm:"not null"`
	SellerID           uint        `json:"seller_id" gorm:"not null"`
	MediatorID         *uint       `json:"mediator_id,omitempty"`
	Amount             uint        `json:"amount" gorm:"not null"`
	PlatformFee        uint        `json:"platform_fee"`
	Status             string      `json:"status" gorm:"default:'Pending'" validate:"oneof=Pending Verifying Funded Active Released Disputed Canceled Refunded"`

	// Core Agreement Fields
	Title              string      `json:"title,omitempty"`
	SubType            string      `json:"sub_type,omitempty"`
	EscrowType         string      `json:"escrow_type" gorm:"default:'service-for-payment'"`
	AgreementReference string      `json:"agreement_reference,omitempty"`
	AgreementURI       string      `json:"agreement_uri,omitempty"`
	GoverningRules     string      `json:"governing_rules,omitempty"`
	InspectionPeriod   int         `json:"inspection_period,omitempty"`
	Conditions         string      `json:"conditions,omitempty"`
	Jurisdiction       string      `json:"jurisdiction,omitempty"`
	GoverningLaw       string      `json:"governing_law,omitempty"`
	DisputeResolution  string      `json:"dispute_resolution,omitempty"`

	// Blockchain / Security
	EscrowHash         string      `json:"escrow_hash,omitempty" gorm:"uniqueIndex;size:66"`
	BlockchainTxHash   string      `json:"blockchain_tx_hash,omitempty"`
	BlockchainEscrowID uint        `json:"blockchain_escrow_id,omitempty"`
	ContractHash       string      `json:"contract_hash,omitempty"`
	BuyerSignature     string      `json:"buyer_signature,omitempty"`
	SellerSignature    string      `json:"seller_signature,omitempty"`

	// Dispute & Resolution
	DisputeReason      string      `json:"dispute_reason,omitempty"`
	DisputeStatus      string      `json:"dispute_status,omitempty" gorm:"default:'None'"`
	ResolvedByID       *uint       `json:"resolved_by_id,omitempty"`
	ResolutionNote     string      `json:"resolution_note,omitempty"`
	ReceiptURL         string      `json:"receipt_url,omitempty"`
	TransactionRef     *string     `json:"transaction_ref,omitempty" gorm:"uniqueIndex"`

	// Status & Lifecycle
	Active             bool        `json:"active" gorm:"default:false"`
	IsLocked           bool        `json:"is_locked" gorm:"default:false"`
	IsDetailed         bool        `json:"is_detailed" gorm:"default:false"`
	InviteSent         bool        `json:"invite_sent" gorm:"default:false"`
	Snapshot           string      `json:"snapshot,omitempty"`

	// Associations
	Buyer              *User       `json:"buyer,omitempty" gorm:"foreignKey:BuyerID"`
	Seller             *User       `json:"seller,omitempty" gorm:"foreignKey:SellerID"`
	Mediator           *User       `json:"mediator,omitempty" gorm:"foreignKey:MediatorID"`
	Milestones         []Milestone `json:"milestones,omitempty" gorm:"foreignKey:EscrowID"`
	Obligations        []Obligation `json:"obligations,omitempty" gorm:"foreignKey:EscrowID"`
}

type Obligation struct {
	gorm.Model
	EscrowID          uint   `json:"escrow_id"`
	ResponsibleParty  string `json:"responsible_party"` // depositor/beneficiary/agent
	ObligationType    string `json:"obligation_type"`   // service-performance/payment/approval
	Title             string `json:"title"`
	Description       string `json:"description"`
	Status            string `json:"status" gorm:"default:'pending'"`
	Deadline          *time.Time `json:"deadline"`
}

type Contact struct {
	gorm.Model
	UserID    uint `json:"user_id" gorm:"not null"`
	ContactID uint `json:"contact_id" gorm:"not null"`
}
