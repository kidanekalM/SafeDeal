package models

import "gorm.io/gorm"

// EscrowStatusEvent stores immutable status transitions for auditability.
type EscrowStatusEvent struct {
	gorm.Model
	ID          uint   `json:"id" gorm:"primaryKey"`
	EscrowID    uint   `json:"escrow_id" gorm:"index;not null"`
	ActorID     uint   `json:"actor_id"`
	FromStatus  string `json:"from_status"`
	ToStatus    string `json:"to_status" gorm:"not null"`
	Reason      string `json:"reason,omitempty"`
	TxHash      string `json:"tx_hash,omitempty"`
	Metadata    string `json:"metadata,omitempty"`
}
