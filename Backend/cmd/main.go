package main

import (
	"fmt"
	"log"
	"os"

	"backend_monolithic/configs"
	"backend_monolithic/internal/rabbitmq"
	"backend_monolithic/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	_ = godotenv.Load()

	// Initialize database
	db := configs.InitDB()

	// Initialize RabbitMQ
	rabbitMQ, err := rabbitmq.NewProducer()
	if err != nil {
		log.Printf("Warning: Failed to initialize RabbitMQ: %v", err)
	}
	defer func() {
		if rabbitMQ != nil {
			rabbitMQ.Close()
		}
	}()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName: "SafeDeal Monolith v1.0",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
	}))

	// Initialize Service Container
	serviceContainer := routes.NewServiceContainer(db, rabbitMQ)

	// Add Health Check Route
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "SafeDeal API is running",
			"version": "1.0-intent-based",
			"engine": "Go Fiber",
		})
	})

	// Setup routes
	routes.SetupRoutes(app, serviceContainer)

	port := os.Getenv("PORT")
	if port == "" {
		port = "7860"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}
