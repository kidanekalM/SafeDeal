package models

import "gorm.io/gorm"

type Escrow struct {
	gorm.Model
	ID                   uint   `json:"id" gorm:"primaryKey"`
	BuyerID              uint   `json:"buyer_id" gorm:"not null"`
	SellerID             uint   `json:"seller_id" gorm:"not null"`
	Amount               uint   `json:"amount" validate:"required,gt=0"`
	Status               string `json:"status" gorm:"default:'Pending'" validate:"oneof=Pending Funded Active Released Disputed Canceled Refunded"`
	Conditions           string `json:"conditions,omitempty"`
	BlockchainTxHash     string `json:"blockchain_tx_hash,omitempty"`
	BlockchainEscrowID   uint   `json:"blockchain_escrow_id,omitempty"`
	Active               bool   `json:"active" gorm:"default:true"`
	GoverningLaw         string `json:"governing_law,omitempty"`
	Jurisdiction         string `json:"jurisdiction,omitempty"`
	ContractHash         string `json:"contract_hash,omitempty"`
	DocumentStorageURI   string `json:"document_storage_uri,omitempty"`
	DepositTimestamp     string `json:"deposit_timestamp,omitempty"`
	Deadline             string `json:"deadline,omitempty"`
	AutoRelease          bool   `json:"auto_release" gorm:"default:false"`
	RequiredApprovals    int    `json:"required_approvals" gorm:"default:1"`
	EvidenceURI          string `json:"evidence_uri,omitempty"`
	TermsAcceptedAt      string `json:"terms_accepted_at,omitempty"`
	SignatureHash        string `json:"signature_hash,omitempty"`
	
	Buyer  *User `json:"buyer,omitempty" gorm:"foreignKey:BuyerID"`
	Seller *User `json:"seller,omitempty" gorm:"foreignKey:SellerID"`
	Milestones []Milestone `json:"milestones,omitempty" gorm:"foreignKey:EscrowID"`
}

type Contact struct {
	gorm.Model
	UserID    uint `json:"user_id" gorm:"not null"`
	ContactID uint `json:"contact_id" gorm:"not null"`
}