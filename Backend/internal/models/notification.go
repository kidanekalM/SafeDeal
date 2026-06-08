package models

import "gorm.io/gorm"

type Notification struct {
	gorm.Model
	ID       uint   `json:"id" gorm:"primaryKey"`
	UserID   uint   `json:"user_id" gorm:"not null"`
	Type     string `json:"type" validate:"required"`
	Title    string `json:"title" validate:"required"`
	Message  string `json:"message" validate:"required"`
	Read     bool   `json:"read" gorm:"default:false"`
	Metadata string `json:"metadata,omitempty"`
}
