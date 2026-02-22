package routes

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/handlers"
	"backend_monolithic/internal/rabbitmq"
	"gorm.io/gorm"
)

type ServiceContainer struct {
	AuthService   *auth.Service
	UserHandler   *handlers.UserHandler
	EscrowHandler *handlers.EscrowHandler
	PaymentHandler *handlers.PaymentHandler
	ChatHandler   *handlers.ChatHandler
	NotificationHandler *handlers.NotificationHandler
}

func NewServiceContainer(db *gorm.DB, rabbitMQ *rabbitmq.Producer) *ServiceContainer {
	authService := auth.NewService(db)
	
	// Initialize blockchain client
	blockchainClient, err := blockchain.NewClient()
	if err != nil {
		log.Printf("Warning: Failed to initialize blockchain client: %v. Some features may be unavailable.", err)
		blockchainClient = nil
	}
	
	return &ServiceContainer{
		AuthService: authService,
		UserHandler: handlers.NewUserHandler(db, authService),
		EscrowHandler: handlers.NewEscrowHandler(db, authService, rabbitMQ, blockchainClient),
		PaymentHandler: handlers.NewPaymentHandler(db, authService, rabbitMQ),
		ChatHandler: handlers.NewChatHandler(db, authService),
		NotificationHandler: handlers.NewNotificationHandler(db, authService),
	}
}

func SetupRoutes(app *fiber.App, sc *ServiceContainer) {
	// Public routes
	public := app.Group("/api")
	public.Post("/register", sc.UserHandler.Register)
	public.Post("/login", sc.UserHandler.Login)
	public.Post("/refresh-token", sc.UserHandler.RefreshToken) // Add refresh token route
	public.Get("/activate", sc.UserHandler.ActivateAccount)
	public.Post("/resend-activation", sc.UserHandler.ResendActivation)
	// Removing public search for security - only allow authenticated users to search
	// public.Get("/search", sc.UserHandler.Search)
	
	// Adding a separate route for resend that doesn't require authentication
	app.Post("/resend", sc.UserHandler.ResendActivation) // Used by frontend without /api prefix

	// Protected routes
	protected := app.Group("/api", sc.AuthService.JWTMiddleware)
	protected.Post("/logout", sc.UserHandler.Logout) // This maps to /api/logout
	protected.Get("/profile", sc.UserHandler.GetProfile)
	protected.Patch("/updateprofile", sc.UserHandler.UpdateProfile)
	protected.Put("/profile/bank-details", sc.UserHandler.UpdateBankDetails)
	protected.Post("/wallet", sc.UserHandler.ManageWallet)
	
	// Search endpoint - only available to authenticated users
	protected.Get("/search", sc.UserHandler.SearchUsers)
	
	// Escrow routes
	protected.Post("/escrows", sc.EscrowHandler.CreateEscrow)
	protected.Get("/escrows/my", sc.EscrowHandler.GetMyEscrows)
	protected.Get("/escrows/contacts", sc.EscrowHandler.GetEscrowContacts)
	protected.Get("/escrows/:id", sc.EscrowHandler.GetEscrowByID)
	protected.Post("/escrows/:id/accept", sc.EscrowHandler.AcceptEscrow)
	protected.Post("/escrows/:id/confirm-receipt", sc.EscrowHandler.ConfirmReceipt)
	protected.Post("/escrows/:id/cancel", sc.EscrowHandler.CancelEscrow)
	protected.Post("/escrows/:id/refund", sc.EscrowHandler.RefundEscrow)
	protected.Post("/escrows/dispute/:id", sc.EscrowHandler.CreateDispute)
	protected.Get("/escrows/dispute/:id", sc.EscrowHandler.GetDispute)
	
	// Payment routes
	protected.Post("/payments/initiate", sc.PaymentHandler.InitiatePayment)
	protected.Get("/payments/transactions", sc.PaymentHandler.GetTransactions)
	
	// Chat routes
	protected.Get("/chat/ws/:id", websocket.New(sc.ChatHandler.HandleWebSocket))
	
	// Notification routes
	protected.Get("/notifications/ws", websocket.New(sc.NotificationHandler.HandleWebSocket))
}