package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/handlers"
	"backend_monolithic/internal/rabbitmq"
	"backend_monolithic/pkg/mailer"
	"gorm.io/gorm"
	)

	type ServiceContainer struct {
	DB                  *gorm.DB
	AuthService         *auth.Service
	UserHandler         *handlers.UserHandler
	EscrowHandler       *handlers.EscrowHandler
	PaymentHandler      *handlers.PaymentHandler
	ChatHandler         *handlers.ChatHandler
	NotificationHandler *handlers.NotificationHandler
	BlockChainClient    *blockchain.Client
	MilestoneHandler    *handlers.MilestoneHandler
	Mailer              *mailer.Mailer
	}

	func NewServiceContainer(db *gorm.DB, rabbitMQ *rabbitmq.Producer) *ServiceContainer {
	authService := auth.NewService(db)
	blockchainClient, err := blockchain.NewClient() // Actual implementation
	if err != nil {
		panic(err) // Handle error appropriately in production
	}

	notificationHandler := handlers.NewNotificationHandler(db, authService)
	milestoneHandler := handlers.NewMilestoneHandler(db, blockchainClient)
	mail := mailer.NewMailer() // Instantiate the mailer

	return &ServiceContainer{
		DB:                  db,
		AuthService:         authService,
		UserHandler:         handlers.NewUserHandler(db, authService, notificationHandler),
		EscrowHandler:       handlers.NewEscrowHandler(db, authService, rabbitMQ, blockchainClient, notificationHandler),
		PaymentHandler:      handlers.NewPaymentHandler(db, authService, rabbitMQ),
		ChatHandler:         handlers.NewChatHandler(db, authService),
		NotificationHandler: notificationHandler,
		MilestoneHandler:    milestoneHandler,
		BlockChainClient:    blockchainClient,
		Mailer:              mail, // Add the mailer instance
	}
	}

func SetupRoutes(app *fiber.App, sc *ServiceContainer) {
	// Root API group
	api := app.Group("/api")

	// Public routes (no middleware)
	api.Post("/register", sc.UserHandler.Register)
	api.Post("/login", sc.UserHandler.Login)
	api.Get("/activate", sc.UserHandler.ActivateAccount)
	api.Post("/refresh-token", sc.UserHandler.RefreshToken)
	
	// WebSocket routes (no middleware)
	api.Get("/chat/ws/:id", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// Extract token from header or query parameter
			authHeader := c.Get("Authorization")
			token := ""
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			} else {
				token = c.Query("token")
			}
			c.Locals("token", token)
			c.Locals("escrow_id", c.Params("id"))
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}, websocket.New(sc.ChatHandler.HandleWebSocket))

	api.Get("/notifications/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// Extract token from header or query parameter
			authHeader := c.Get("Authorization")
			token := ""
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			} else {
				token = c.Query("token")
			}
			c.Locals("token", token)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}, websocket.New(sc.NotificationHandler.HandleWebSocket))

	// Protected routes group (v1)
	v1 := api.Group("/v1", sc.AuthService.JWTMiddleware)

	// User routes
	v1.Get("/profile", sc.UserHandler.GetProfile)            // GET request to fetch profile
	v1.Get("/profile/trust-insights", sc.UserHandler.GetTrustInsights)
	v1.Patch("/updateprofile", sc.UserHandler.UpdateProfile) // PATCH request to update profile (as expected by frontend)
	v1.Get("/profile/bank-details", sc.UserHandler.GetBankDetails)
	v1.Put("/profile/bank-details", sc.UserHandler.UpdateBankDetails)
	v1.Post("/wallet", sc.UserHandler.CreateWallet) // Endpoint for creating Ethereum wallet
	v1.Post("/logout", sc.UserHandler.Logout)

	// Escrow routes
	v1.Post("/escrows", sc.EscrowHandler.CreateEscrow)
	v1.Get("/escrows/:id", sc.EscrowHandler.GetEscrowByID)
	v1.Get("/escrows", sc.EscrowHandler.GetMyEscrows)
	v1.Put("/escrows/:id/accept", sc.EscrowHandler.AcceptEscrow)
	v1.Post("/escrows/:id/lock", sc.EscrowHandler.LockEscrow)
	v1.Put("/escrows/:id", sc.EscrowHandler.UpdateEscrow)
	v1.Post("/escrows/:id/verify", sc.EscrowHandler.VerifyPayment)
	v1.Post("/escrows/:id/verify-cbe", sc.EscrowHandler.VerifyCBEPayment)
	v1.Post("/escrows/:id/cancel", sc.EscrowHandler.CancelEscrow)

	v1.Put("/escrows/:id/confirm-receipt", sc.EscrowHandler.ConfirmReceipt)
	v1.Post("/escrows/dispute/:id", sc.EscrowHandler.CreateDispute) // Endpoint for creating disputes
	v1.Get("/escrows/dispute/:id", sc.EscrowHandler.GetDispute)
	v1.Post("/escrows/dispute/:id/ai-decision", sc.EscrowHandler.RequestAIDecision)
	v1.Post("/escrows/dispute/:id/resolve", sc.EscrowHandler.ResolveDispute)
	v1.Post("/escrows/:id/refund", sc.EscrowHandler.RefundEscrow) // Changed to POST to match standard REST practices
	v1.Post("/escrows/:id/receipt", sc.EscrowHandler.UploadReceipt)
	v1.Get("/escrows/:id/status-history", sc.EscrowHandler.GetStatusHistory)
	v1.Get("/escrows/:id/final-agreement", sc.EscrowHandler.DownloadFinalizedAgreement)
	v1.Get("/escrows/contacts", sc.EscrowHandler.GetEscrowContacts)

	// Search routes - for finding users
	v1.Get("/search", sc.UserHandler.SearchUsers)        // Combined endpoint for getting all or searching users

	// Milestone routes
	v1.Post("/milestones", sc.MilestoneHandler.CreateMilestone)
	v1.Get("/milestones/:id", sc.MilestoneHandler.GetMilestone)
	v1.Get("/escrows/:escrowId/milestones", sc.MilestoneHandler.GetMilestonesByEscrow)
	v1.Put("/milestones/:id", sc.MilestoneHandler.UpdateMilestone)
	v1.Put("/milestones/:id/submit", sc.MilestoneHandler.SubmitMilestone)
	v1.Put("/milestones/:id/approve", sc.MilestoneHandler.ApproveMilestone)
	v1.Put("/milestones/:id/reject", sc.MilestoneHandler.RejectMilestone)

	// Payment routes
	v1.Post("/payments/initiate", sc.PaymentHandler.InitiatePayment)
	v1.Get("/payments/transactions", sc.PaymentHandler.GetTransactions)
}

// Export the service container for use in verification handler
func (sc *ServiceContainer) GetDB() *gorm.DB {
	return sc.DB
}
