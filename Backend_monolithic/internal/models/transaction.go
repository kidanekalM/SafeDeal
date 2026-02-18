package models

import "gorm.io/gorm"

type Transaction struct {
	gorm.Model
	ID             uint   `json:"id" gorm:"primaryKey"`
	EscrowID       uint   `json:"escrow_id" gorm:"not null"`
	BuyerID        uint   `json:"buyer_id" gorm:"not null"`
	TransactionRef string `json:"transaction_ref" gorm:"not null"`
	Amount         uint   `json:"amount" validate:"required,gt=0"`
	Currency       string `json:"currency" gorm:"default:'ETB'"`
	Status         string `json:"status" gorm:"default:'Pending'" validate:"oneof=Pending Completed Failed Refunded"`
	PaymentURL     string `json:"payment_url,omitempty"`
}