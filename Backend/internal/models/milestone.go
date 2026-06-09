package models

import "gorm.io/gorm"

type MilestoneStatus string

const (
	MilestonePending   MilestoneStatus = "Pending"
	MilestoneFunded    MilestoneStatus = "Funded"
	MilestoneSubmitted MilestoneStatus = "Submitted"
	MilestoneApproved  MilestoneStatus = "Approved"
	MilestoneRejected  MilestoneStatus = "Rejected"
	MilestoneReleased  MilestoneStatus = "Released"
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
	ContentHash    string          `json:"content_hash,omitempty"` // SHA256 of uploaded deliverable
	FilePath       string          `json:"file_path,omitempty"`    // Local storage path

	// Normalized Condition Fields (Court Standard Compliance)
	VerificationMethod string      `json:"verification_method,omitempty"`
	AutoRelease        bool        `json:"auto_release" gorm:"default:false"`
	RequiredApprovals  int         `json:"required_approvals" gorm:"default:1"`
	ConditionType      string      `json:"condition_type,omitempty"` // delivery_confirmed, time_release, etc.

	// Enhanced Normalized Condition Fields
	AcceptanceCriteria string      `json:"acceptance_criteria,omitempty"`
	RejectionConditions string     `json:"rejection_conditions,omitempty"`
	CureTerms          string      `json:"cure_terms,omitempty"`
	RevisionWindow     int         `json:"revision_window,omitempty"` // in days

	// Flexible JSON storage
	ExtraData          string      `json:"extra_data,omitempty" gorm:"type:jsonb"`

	// Associations
	Escrow   *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
	Approver *User   `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
}
