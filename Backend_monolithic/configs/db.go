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
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback to a local PostgreSQL instance if DATABASE_URL is not set
		dsn = "host=localhost user=postgres password=password dbname=safedeal port=5432 sslmode=disable"
	}

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Migrate the schema
	DB.AutoMigrate(&models.User{}, &models.Escrow{}, &models.Transaction{}, &models.Message{}, &models.Notification{}, &models.BankDetails{}, &models.Contact{})

	fmt.Println("Successfully connected to PostgreSQL database")
	return DB
}