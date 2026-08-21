package models

import (
	"time"
)

type Message struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	EscrowID  uint      `json:"escrow_id" gorm:"not null"`
	SenderID  string    `json:"sender_id" gorm:"type:varchar(36);not null"`
	Content   string    `json:"content" validate:"required,min=1,max=1000"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Sender    *User     `json:"sender,omitempty" gorm:"foreignKey:SenderID;references:ID"`
	Escrow    *Escrow   `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
}
