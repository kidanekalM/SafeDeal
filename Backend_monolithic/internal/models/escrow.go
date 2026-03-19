package models

import "gorm.io/gorm"

type Escrow struct {
	gorm.Model
	ID                 uint        `json:"id" gorm:"primaryKey"`
	BuyerID            uint        `json:"buyer_id" gorm:"not null"`
	SellerID           uint        `json:"seller_id" gorm:"not null"`
	MediatorID         *uint       `json:"mediator_id,omitempty"`
	Amount             uint        `json:"amount" validate:"required,gt=0"`
	Status             string      `json:"status" gorm:"default:'Pending'" validate:"oneof=Pending Funded Active Released Disputed Canceled Refunded"`
	Conditions         string      `json:"conditions,omitempty"`
	BlockchainTxHash   string      `json:"blockchain_tx_hash,omitempty"`
	BlockchainEscrowID uint        `json:"blockchain_escrow_id,omitempty"`
	Active             bool        `json:"active" gorm:"default:true"`
	Jurisdiction       string      `json:"jurisdiction,omitempty"`
	GoverningLaw       string      `json:"governing_law,omitempty"`
	DisputeResolution  string      `json:"dispute_resolution,omitempty"`
	ReceiptURL         string      `json:"receipt_url,omitempty"`
	Buyer              *User       `json:"buyer,omitempty" gorm:"foreignKey:BuyerID"`
	Seller             *User       `json:"seller,omitempty" gorm:"foreignKey:SellerID"`
	Mediator           *User       `json:"mediator,omitempty" gorm:"foreignKey:MediatorID"`
	Milestones         []Milestone `json:"milestones,omitempty" gorm:"foreignKey:EscrowID"`
}

type Contact struct {
	gorm.Model
	UserID    uint `json:"user_id" gorm:"not null"`
	ContactID uint `json:"contact_id" gorm:"not null"`
}