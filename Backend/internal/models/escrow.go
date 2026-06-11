package models

import (
	"time"

	"gorm.io/gorm"
)

type Escrow struct {
	gorm.Model
	ID                 uint         `json:"id" gorm:"primaryKey"`
	BuyerID            uint         `json:"buyer_id" gorm:"not null"`
	SellerID           uint         `json:"seller_id" gorm:"not null"`
	MediatorID         *uint        `json:"mediator_id,omitempty"`
	Amount             uint         `json:"amount" gorm:"not null"`
	PlatformFee        uint         `json:"platform_fee"`
	Status             EscrowStatus `json:"status" gorm:"default:'pending'"`

	// 🎨 User Intent Fields (Simplified UI)
	EscrowType         string      `json:"escrow_type" gorm:"default:'item'"` // 'item' or 'project'
	Title              string      `json:"title,omitempty"`
	Description        string      `json:"description,omitempty" gorm:"type:text"`
	DeliveryDate       *time.Time  `json:"delivery_date,omitempty"`
	InspectionPeriod   int         `json:"inspection_period" gorm:"default:3"` // in days
	
	// 📜 Contract Management
	ContractVersion    string      `json:"contract_version,omitempty" gorm:"default:'1.0'"`
	GeneratedContract  string      `json:"generated_contract,omitempty" gorm:"type:text"`
	BuyerAcceptedAt    *time.Time  `json:"buyer_accepted_at,omitempty"`
	SellerAcceptedAt   *time.Time  `json:"seller_accepted_at,omitempty"`

	// 🧱 Internal Legal Framework (Deterministic Defaults)
	Jurisdiction       string      `json:"jurisdiction,omitempty" gorm:"default:'Ethiopia'"`
	GoverningLaw       string      `json:"governing_law,omitempty" gorm:"default:'Commercial Code of Ethiopia'"`
	DisputeResolution  string      `json:"dispute_resolution,omitempty" gorm:"default:'AI Arbitration via SafeDeal'"`

	// Flexible JSON storage
	ExtraData          string      `json:"extra_data,omitempty" gorm:"type:jsonb"`

	// Logic Flags
	AutoRelease          bool      `json:"auto_release" gorm:"default:false"`
	RequiredApprovals    int       `json:"required_approvals" gorm:"default:1"`
	
	// Blockchain / Security
	EscrowHash         string      `json:"escrow_hash,omitempty" gorm:"uniqueIndex;size:66"`
	BlockchainTxHash   string      `json:"blockchain_tx_hash,omitempty"`
	BlockchainEscrowID uint        `json:"blockchain_escrow_id,omitempty"`
	ContractHash       string      `json:"contract_hash,omitempty"`

	// Legacy / Compatibility (Maintained for handler stability)
	Conditions         string      `json:"conditions,omitempty"`
	SubType            string      `json:"sub_type,omitempty"`
	AgreementReference string      `json:"agreement_reference,omitempty"`
	DeliveryMethod     string      `json:"delivery_method,omitempty"`
	CompletionDate     *time.Time  `json:"completion_date,omitempty"`
	
	// Dispute & Resolution
	DisputeReason      string         `json:"dispute_reason,omitempty"`
	DisputeStatus      DisputeStatus  `json:"dispute_status,omitempty" gorm:"default:'none'"`
	ResolutionType     ResolutionType `json:"resolution_type,omitempty" gorm:"default:'none'"`
	ResolvedByID       *uint          `json:"resolved_by_id,omitempty"`
	ResolutionNote     string         `json:"resolution_note,omitempty"`
	ReceiptURL         string         `json:"receipt_url,omitempty"`
	TransactionRef     *string        `json:"transaction_ref,omitempty" gorm:"uniqueIndex"`

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
	ExtraData         string `json:"extra_data,omitempty" gorm:"type:jsonb"`
}

type Contact struct {
	gorm.Model
	UserID    uint `json:"user_id" gorm:"not null"`
	ContactID uint `json:"contact_id" gorm:"not null"`
}
