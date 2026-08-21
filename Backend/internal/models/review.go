package models

import (
	"time"
)

type Review struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	ReviewerID string `json:"reviewer_id" gorm:"type:varchar(36);not null"`
	RevieweeID string `json:"reviewee_id" gorm:"type:varchar(36);not null"`
	EscrowID   uint   `json:"escrow_id" gorm:"not null"`
	Rating     int    `json:"rating" gorm:"check:rating >= 1 AND rating <= 5"`
	Comment    string `json:"comment" gorm:"type:text"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Reviewer *User   `json:"reviewer,omitempty" gorm:"foreignKey:ReviewerID;references:ID"`
	Reviewee *User   `json:"reviewee,omitempty" gorm:"foreignKey:RevieweeID;references:ID"`
	Escrow   *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
}
