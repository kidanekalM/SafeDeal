package models

import "gorm.io/gorm"

type Milestone struct {
	gorm.Model
	ID             uint            `json:"id" gorm:"primaryKey"`
	EscrowID       uint            `json:"escrow_id" gorm:"not null"`
	Title          string          `json:"title" gorm:"not null;size:200"`
	Description    string          `json:"description" gorm:"type:text"`
	Amount         uint            `json:"amount" gorm:"not null"`
	DueDate        *string         `json:"due_date,omitempty"`
	Status         MilestoneStatus `json:"status" gorm:"default:'pending'"`
	OrderIndex     int             `json:"order_index" gorm:"default:0"`
	ApproverID     *uint           `json:"approver_id" gorm:"default:null"`
	SubmittedAt    *string         `json:"submitted_at,omitempty"`
	ApprovedAt     *string         `json:"approved_at,omitempty"`
	DeliverableURL *string         `json:"deliverable_url,omitempty"`
	ContentHash    string          `json:"content_hash,omitempty"`
	FilePath       string          `json:"file_path,omitempty"`

	// 🧱 5. MINIMUM LEGALLY STRONG ESCROW (REQUIRED FIELDS)
	CompletionType        CompletionType        `json:"completion_type"`
	VerificationAuthority VerificationAuthority `json:"verification_authority"`
	ReleaseTrigger        ReleaseTrigger        `json:"release_trigger"`
	EvidenceTypes         string                `json:"evidence_types"` // Comma-separated or JSON array string of EvidenceType
	
	// 🧩 3. BUSINESS LOGIC RULES
	AutoAcceptDays       int `json:"auto_accept_days" gorm:"default:0"`
	InspectionPeriodDays int `json:"inspection_period_days" gorm:"default:7"`
	RequiredApprovals    int `json:"required_approvals" gorm:"default:1"`

	// Enhanced Normalized Condition Fields
	AcceptanceCriteria string      `json:"acceptance_criteria,omitempty"`
	RejectionConditions string     `json:"rejection_conditions,omitempty"`
	CureTerms          string      `json:"cure_terms,omitempty"`
	RevisionWindow     int         `json:"revision_window,omitempty"`

	// Flexible JSON storage
	ExtraData          string      `json:"extra_data,omitempty" gorm:"type:jsonb"`

	// Associations
	Escrow   *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
	Approver *User   `json:"approver,omitempty" gorm:"foreignKey:ApproverID"`
}
