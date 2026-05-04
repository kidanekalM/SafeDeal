package models

import (
	"gorm.io/gorm"
)

type Review struct {
	gorm.Model
	ID         uint   `json:"id" gorm:"primaryKey"`
	ReviewerID uint   `json:"reviewer_id" gorm:"not null"` // User leaving the review
	RevieweeID uint   `json:"reviewee_id" gorm:"not null"` // User being reviewed
	EscrowID   uint   `json:"escrow_id" gorm:"not null"`
	Rating     int    `json:"rating" gorm:"check:rating >= 1 AND rating <= 5"` // 1-5 stars
	Comment    string `json:"comment" gorm:"type:text"`

	// Associations
	Reviewer *User   `json:"reviewer,omitempty" gorm:"foreignKey:ReviewerID"`
	Reviewee *User   `json:"reviewee,omitempty" gorm:"foreignKey:RevieweeID"`
	Escrow   *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
}
