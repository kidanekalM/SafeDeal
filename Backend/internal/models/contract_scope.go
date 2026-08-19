package models

import "gorm.io/gorm"

// ContractScope holds the structured, unambiguous answers to the fixed
// six-question contract skeleton. It is stored per-escrow (1:1) and rendered
// into the printable agreement. Keeping it typed (rather than free-text JSON)
// makes each field queryable and each list item structurally incapable of
// being vague.
type ContractScope struct {
	gorm.Model
	EscrowID uint `json:"escrow_id" gorm:"not null;uniqueIndex"`

	// Q1 What exactly is being delivered (list) -> ContractDeliverable rows.
	// Q2 How "done" is confirmed (dropdown standard + optional detail).
	AcceptanceMethod string `json:"acceptance_method" gorm:"default:'buyer_approval'"`
	AcceptanceDetail string `json:"acceptance_detail,omitempty" gorm:"type:text"`

	// Q3 By when.
	DueDate string `json:"due_date,omitempty"`

	// Q4 What happens if rejected.
	RejectionPolicy string `json:"rejection_policy,omitempty" gorm:"type:text"`
	CurePeriodDays  int    `json:"cure_period_days" gorm:"default:0"`

	// Q5 What is explicitly NOT included (list) -> ContractExclusion rows.
	// Q6 What happens if either side breaks the deal.
	BreachTerms           string `json:"breach_terms,omitempty" gorm:"type:text"`
	TerminationNoticeDays int    `json:"termination_notice_days" gorm:"default:7"`

	// Acceptance procedure: buyer has N days to object in writing with
	// reasons; silence after N days = deemed accepted (never silent-ambiguous).
	AcceptanceDays int  `json:"acceptance_days" gorm:"default:5"`
	DeemedAccept   bool `json:"deemed_accept" gorm:"default:false"`

	// Scope items.
	Deliverables []ContractDeliverable `json:"deliverables,omitempty" gorm:"foreignKey:ScopeID"`
	Exclusions   []ContractExclusion   `json:"exclusions,omitempty" gorm:"foreignKey:ScopeID"`
}

// ContractDeliverable is a single countable, testable item being delivered.
type ContractDeliverable struct {
	gorm.Model
	ScopeID     uint   `json:"scope_id" gorm:"not null"`
	Title       string `json:"title" gorm:"not null"`
	Standard    string `json:"standard" gorm:"default:'none'"` // page_count / named_standard / numeric_threshold / reference_file / none
	StandardRef string `json:"standard_ref,omitempty"`
	OrderIndex  int    `json:"order_index" gorm:"default:0"`
}

// ContractExclusion is a single explicitly-out-of-scope item.
type ContractExclusion struct {
	gorm.Model
	ScopeID    uint   `json:"scope_id" gorm:"not null"`
	Title      string `json:"title" gorm:"not null"`
	OrderIndex int    `json:"order_index" gorm:"default:0"`
}