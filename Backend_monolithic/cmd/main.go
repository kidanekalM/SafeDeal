package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"backend_monolithic/configs"
	"backend_monolithic/internal/rabbitmq"
	"backend_monolithic/internal/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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

	// CORS middleware - based on your original setup
	allowedOrigins := []string{
		"https://safe-deal.vercel.app",
		"https://elida-necktieless-unaspiringly.ngrok-free.dev",
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:5173", // Vite default
		"http://127.0.0.1:5173",
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(allowedOrigins, ","),
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-User-ID,ngrok-skip-browser-warning",
		AllowCredentials: true,
	}))

	// Initialize database
	db := configs.InitDB()

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
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}
