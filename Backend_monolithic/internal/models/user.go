package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID                  uint   `json:"id" gorm:"primaryKey"`
	FirstName           string `json:"first_name" validate:"required,min=2,max=32"`
	LastName            string `json:"last_name" validate:"required,min=2,max=32"`
	Email               string `json:"email" gorm:"unique;not null" validate:"required,email"`
	Password            string `json:"-" validate:"required,min=8"`
	Activated           bool   `json:"activated" gorm:"default:false"`
	Profession          string `json:"profession"`
	WalletAddress       string `json:"wallet_address,omitempty"`
	EncryptedPrivateKey string `json:"encrypted_private_key,omitempty"`
	AccountName         string `json:"account_name,omitempty"`
	AccountNumber       string `json:"account_number,omitempty"`
	BankCode            int    `json:"bank_code,omitempty"`
	ActivationCode      string `json:"-"`
}

type BankDetails struct {
	gorm.Model
	UserID      uint   `json:"user_id" gorm:"not null"`
	AccountName string `json:"account_name" validate:"required"`
	AccountNumber string `json:"account_number" validate:"required"`
	BankCode    int    `json:"bank_code" validate:"required"`
}