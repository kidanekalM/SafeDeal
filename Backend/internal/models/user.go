package models

import (
	"time"
)

type User struct {
	ID                  string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	FirstName           string    `json:"first_name" validate:"required,min=2,max=32"`
	LastName            string    `json:"last_name" validate:"required,min=2,max=32"`
	Email               string    `json:"email" gorm:"unique;not null" validate:"required,email"`
	PhoneNumber         string    `json:"phone_number" validate:"required"`
	Password            string    `json:"-" validate:"required,min=8"`
	Activated           bool      `json:"activated" gorm:"default:false"`
	Role                string    `json:"role" gorm:"default:'user'"` // user, admin, mediator
	Profession          string    `json:"profession"`
	WalletAddress       string    `json:"wallet_address,omitempty"`
	EncryptedPrivateKey string    `json:"encrypted_private_key,omitempty"`
	AccountName         string    `json:"account_name,omitempty"`
	AccountNumber       string    `json:"account_number,omitempty"`
	BankCode            int       `json:"bank_code,omitempty"`
	BankName            string    `json:"bank_name,omitempty"`
	ActivationCode      string    `json:"-"`
	TrustScore          float64   `json:"trust_score" gorm:"default:65.0"`
	IsPatient           bool      `json:"is_patient" gorm:"default:false"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
	Ratings             []Review  `json:"ratings,omitempty" gorm:"foreignKey:RevieweeID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	ReviewsGiven        []Review  `json:"reviews_given,omitempty" gorm:"foreignKey:ReviewerID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
}

type BankDetails struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        string    `json:"user_id" gorm:"type:varchar(36);not null"`
	AccountName   string    `json:"account_name" validate:"required"`
	AccountNumber string    `json:"account_number" validate:"required"`
	BankCode      int       `json:"bank_code" validate:"required"`
	BankName      string    `json:"bank_name" validate:"required"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ActivationToken struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"type:varchar(36);not null"`
	Token     string    `json:"gorm:not null;uniqueIndex"`
	ExpiresAt time.Time `json:"gorm:not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
