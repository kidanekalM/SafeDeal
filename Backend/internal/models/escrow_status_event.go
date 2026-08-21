package models

import (
	"time"
)

// EscrowStatusEvent stores immutable status transitions for auditability.
type EscrowStatusEvent struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	EscrowID    uint   `json:"escrow_id" gorm:"index;not null"`
	ActorID     string `json:"actor_id" gorm:"type:varchar(36)"`
	FromStatus  string `json:"from_status"`
	ToStatus    string `json:"to_status" gorm:"not null"`
	Reason      string `json:"reason,omitempty"`
	TxHash      string `json:"tx_hash,omitempty"`
	Metadata    string `json:"metadata,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
