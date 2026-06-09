package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backend_monolithic/configs"
	"backend_monolithic/internal/models"
	"backend_monolithic/internal/rabbitmq"
	"backend_monolithic/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	app := fiber.New()

	// Middlewares
	app.Use(logger.New())

	// CORS middleware - move BEFORE rate limiter so 429s have CORS headers
	allowedOrigins := []string{
		"https://safe-deal.vercel.app",
		"https://elida-necktieless-unaspiringly.ngrok-free.dev",
		"http://localhost:3000",
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		"http://localhost:5173", // Vite default
		"http://127.0.0.1:5173",
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(allowedOrigins, ","),
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-User-ID,ngrok-skip-browser-warning",
		AllowCredentials: true,
	}))

	// Rate Limiter: Reduced for production
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
	}))

	// Initialize database
	db := configs.InitDB()
	// Auto-migrate escrow-related models
	if err := db.AutoMigrate(
		&models.User{},
		&models.Escrow{},
		&models.Milestone{},
		&models.Message{},
		&models.Notification{},
		&models.Transaction{},
		&models.Review{},
		&models.EscrowStatusEvent{},
		&models.BankDetails{},
		&models.ActivationToken{},
	); err != nil {
		log.Printf("AutoMigrate models error: %v", err)
	}

	// Initialize RabbitMQ (mock implementation)
	rabbitMQ, err := rabbitmq.NewProducer()
	if err != nil {
		log.Fatalf("Failed to initialize message broker: %v", err)
	}
	// Note: In the mock implementation, Close() does nothing

	// Initialize services
	serviceContainer := routes.NewServiceContainer(db, rabbitMQ)

	// Setup routes
	routes.SetupRoutes(app, serviceContainer)

	port := os.Getenv("PORT")
	if port == "" {
		port = "7860"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}