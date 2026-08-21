package models

import (
	"time"
)

type Transaction struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	EscrowID       uint   `json:"escrow_id" gorm:"not null"`
	BuyerID        string `json:"buyer_id" gorm:"type:varchar(36);not null"`
	TransactionRef string `json:"transaction_ref" gorm:"not null"`
	Amount         uint   `json:"amount" validate:"required,gt=0"`
	Currency       string `json:"currency" gorm:"default:'ETB'"`
	Status         string `json:"status" gorm:"default:'Pending'" validate:"oneof=Pending Completed Failed Refunded"`
	PaymentMethod    string `json:"payment_method,omitempty" gorm:"default:'Chapa'"`
	PaymentURL       string `json:"payment_url,omitempty"`
	BlockchainTxHash string `json:"blockchain_tx_hash,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	Buyer          *User  `json:"buyer,omitempty" gorm:"foreignKey:BuyerID;references:ID"`
	Escrow         *Escrow `json:"escrow,omitempty" gorm:"foreignKey:EscrowID"`
}
