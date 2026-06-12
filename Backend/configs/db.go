package configs

import (
	"fmt"
	"log"
	"os"

	"backend_monolithic/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	var err error

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		fmt.Println("⚠️ DATABASE_URL not set. Falling back to local SQLite for survival mode.")
		DB, err = gorm.Open(sqlite.Open("safedeal_fallback.db"), &gorm.Config{})
	} else {
		fmt.Println("🚀 Connecting to PostgreSQL...")
		DB, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	}

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
		&models.Milestone{},
		&models.EscrowStatusEvent{},
		&models.ActivationToken{},
		&models.AuthorizedRep{},
	)

	fmt.Println("✅ Database schema migrated successfully")
	return DB
}
