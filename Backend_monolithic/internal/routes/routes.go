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
	// Public routes - Direct endpoints (as expected by api.ts)
	app.Post("/login", sc.UserHandler.Login)
	app.Post("/register", sc.UserHandler.Register)
	app.Post("/refresh-token", sc.UserHandler.RefreshToken) // Direct refresh token route
	app.Post("/resend", sc.UserHandler.ResendActivation) // Direct resend route
	
	// Public routes under /api
	public := app.Group("/api")
	public.Get("/activate", sc.UserHandler.ActivateAccount)
	public.Post("/resend-activation", sc.UserHandler.ResendActivation)
	public.Get("/search", sc.UserHandler.SearchUsers)

	// Protected routes
	protected := app.Group("/api", sc.AuthService.JWTMiddleware)
	protected.Post("/logout", sc.UserHandler.Logout) // This maps to /api/logout
	protected.Get("/profile", sc.UserHandler.GetProfile)
	protected.Patch("/updateprofile", sc.UserHandler.UpdateProfile)
	protected.Put("/profile/bank-details", sc.UserHandler.UpdateBankDetails)
	protected.Post("/wallet", sc.UserHandler.ManageWallet)
	
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