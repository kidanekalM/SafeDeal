package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	ID        uint   `json:"id" gorm:"primaryKey"`
	EscrowID  uint   `json:"escrow_id" gorm:"not null"`
	SenderID  uint   `json:"sender_id" gorm:"not null"`
	Content   string `json:"content" validate:"required,min=1,max=1000"`
	CreatedAt string `json:"created_at"`
	Sender    *User  `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
}
