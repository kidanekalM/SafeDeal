package models

import "gorm.io/gorm"

type MilestoneStatus string

const (
	MilestonePending    MilestoneStatus = "Pending"
	MilestoneFunded     MilestoneStatus = "Funded"
	MilestoneSubmitted  MilestoneStatus = "Submitted"
	MilestoneApproved   MilestoneStatus = "Approved"
	MilestoneRejected   MilestoneStatus = "Rejected"
	MilestoneReleased   MilestoneStatus = "Released"
)

type Milestone struct {
	gorm.Model
	ID             uint            `json:"id" gorm:"primaryKey"`
	EscrowID       uint            `json:"escrow_id" gorm:"not null"`
	Title          string          `json:"title" gorm:"not null;size:200"`
	Description    string          `json:"description" gorm:"type:text"`
	Amount         uint            `json:"amount" gorm:"not null"`
	DueDate        *string         `json:"due_date,omitempty"` // Using string to match other timestamps in the codebase
	Status         MilestoneStatus `json:"status" gorm:"default:'Pending'"`
	OrderIndex     int             `json:"order_index" gorm:"default:0"`
	ApproverID     *uint           `json:"approver_id" gorm:"default:null"` // User who approves completion of this milestone
	SubmittedAt    *string         `json:"submitted_at,omitempty"`
	ApprovedAt     *string         `json:"approved_at,omitempty"`
	DeliverableURL *string         `json:"deliverable_url,omitempty"`
	
	// Court-compliant fields
	Name             string          `json:"name,omitempty"`
	CompletionStatus string          `json:"completion_status,omitempty"`
	CompletionTimestamp *string      `json:"completion_timestamp,omitempty"`
	EvidenceURI      string          `json:"evidence_uri,omitempty"`
	VerificationMethod string        `json:"verification_method,omitempty"`
	RequiredApprovals  int           `json:"required_approvals" gorm:"default:1"`
	ApprovedBy         *uint         `json:"approved_by" gorm:"default:null"`
	AutoRelease        bool          `json:"auto_release" gorm:"default:false"`
	Deadline           *string       `json:"deadline,omitempty"`
	ContractHash       string        `json:"contract_hash,omitempty"`
	DocumentStorageURI string        `json:"document_storage_uri,omitempty"`
	TermsAcceptedAt    *string       `json:"terms_accepted_at,omitempty"`
	SignatureHash      string        `json:"signature_hash,omitempty"`

	// Associations
	Escrow   *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
	Approver *User   `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
}