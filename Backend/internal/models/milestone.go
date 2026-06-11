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

	// 🧱 Internal Legal Enforcement (System Controlled)
	CompletionType        CompletionType        `json:"completion_type" gorm:"default:'delivery'"`
	VerificationAuthority VerificationAuthority `json:"verification_authority" gorm:"default:'buyer'"`
	ReleaseTrigger        ReleaseTrigger        `json:"release_trigger" gorm:"default:'buyer_approval'"`
	EvidenceTypes         string                `json:"evidence_types" gorm:"default:'document,photo'"` 
	
	// 🧩 Business Logic (System Managed)
	AutoAcceptDays       int `json:"auto_accept_days" gorm:"default:0"`
	InspectionPeriodDays int `json:"inspection_period_days" gorm:"default:7"`
	RequiredApprovals    int `json:"required_approvals" gorm:"default:1"`

	// Detailed data
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
