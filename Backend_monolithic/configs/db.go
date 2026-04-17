package configs

import (
	"fmt"
	"log"
	"os"

	"backend_monolithic/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	var err error

	// Use the provided PostgreSQL connection string
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	DB, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Migrate the schema
	DB.AutoMigrate(
		&models.User{}, 
		&models.Escrow{}, 
		&models.Transaction{}, 
		&models.Message{}, 
		&models.Notification{}, 
		&models.BankDetails{}, 
		&models.Contact{},
		&models.Milestone{}, // Adding the new Milestone model
		&models.EscrowStatusEvent{},
		&models.ActivationToken{},
	)

	fmt.Println("Successfully connected to PostgreSQL database")
	return DB
}