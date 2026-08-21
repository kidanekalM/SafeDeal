package models

import (
	"time"
)

type Notification struct {
	ID       uint      `json:"id" gorm:"primaryKey"`
	UserID   string    `json:"user_id" gorm:"type:varchar(36);not null"`
	Type     string    `json:"type" validate:"required"`
	Title    string    `json:"title" validate:"required"`
	Message  string    `json:"message" validate:"required"`
	Read     bool      `json:"read" gorm:"default:false"`
	Metadata string    `json:"metadata,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User     *User     `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
}
