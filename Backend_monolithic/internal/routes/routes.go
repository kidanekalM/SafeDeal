package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/blockchain"
	"backend_monolithic/internal/handlers"
	"backend_monolithic/internal/rabbitmq"
	"gorm.io/gorm"
)

type ServiceContainer struct {
	DB                 *gorm.DB
	AuthService        *auth.Service
	UserHandler        *handlers.UserHandler
	EscrowHandler      *handlers.EscrowHandler
	PaymentHandler     *handlers.PaymentHandler
	ChatHandler        *handlers.ChatHandler
	NotificationHandler *handlers.NotificationHandler
	MilestoneHandler   *handlers.MilestoneHandler
}

func NewServiceContainer(db *gorm.DB, rabbitMQ *rabbitmq.Producer) *ServiceContainer {
	authService := auth.NewService(db)
	blockchainClient, err := blockchain.NewClient() // Actual implementation
	if err != nil {
		panic(err) // Handle error appropriately in production
	}

	return &ServiceContainer{
		DB: db,
		AuthService: authService,
		UserHandler:        handlers.NewUserHandler(db, authService),
		EscrowHandler:      handlers.NewEscrowHandler(db, authService, rabbitMQ, blockchainClient),
		PaymentHandler:     handlers.NewPaymentHandler(db, authService, rabbitMQ),
		ChatHandler:        handlers.NewChatHandler(db, authService),
		NotificationHandler: handlers.NewNotificationHandler(db, authService),
		MilestoneHandler:   handlers.NewMilestoneHandler(db),
	}
}

func SetupRoutes(app *fiber.App, sc *ServiceContainer) {
	// Public routes
	public := app.Group("/")
	public.Post("/register", sc.UserHandler.Register)
	public.Post("/login", sc.UserHandler.Login)
	public.Get("/activate", sc.UserHandler.ActivateAccount)

	// Protected routes
	protected := app.Group("/api", sc.AuthService.JWTMiddleware)
	
	// User routes
	protected.Get("/profile", sc.UserHandler.GetProfile)  // GET request to fetch profile
	protected.Patch("/updateprofile", sc.UserHandler.UpdateProfile)  // PATCH request to update profile (as expected by frontend)
	protected.Put("/profile/bank-details", sc.UserHandler.UpdateBankDetails)
	protected.Post("/wallet", sc.UserHandler.CreateWallet) // Endpoint for creating Ethereum wallet
	
	// Escrow routes
	protected.Post("/escrows", sc.EscrowHandler.CreateEscrow)
	protected.Get("/escrows/:id", sc.EscrowHandler.GetEscrowByID)
	protected.Get("/escrows", sc.EscrowHandler.GetMyEscrows)
	protected.Put("/escrows/:id/accept", sc.EscrowHandler.AcceptEscrow)
	protected.Put("/escrows/:id/cancel", sc.EscrowHandler.CancelEscrow)
	protected.Put("/escrows/:id/confirm-receipt", sc.EscrowHandler.ConfirmReceipt)
	protected.Post("/escrows/dispute/:id", sc.EscrowHandler.CreateDispute) // Align with frontend expecting this route format
	protected.Get("/escrows/dispute/:id", sc.EscrowHandler.GetDispute)
	protected.Post("/escrows/:id/refund", sc.EscrowHandler.RefundEscrow) // Changed to POST to match standard REST practices
	protected.Get("/escrows/contacts", sc.EscrowHandler.GetEscrowContacts)

	// Search routes - for finding users
	protected.Get("/search", sc.UserHandler.GetAllUsers) // Endpoint for getting all users
	protected.Get("/search/:query", sc.UserHandler.SearchUsers) // Endpoint for searching users by query

	// Milestone routes
	protected.Post("/milestones", sc.MilestoneHandler.CreateMilestone)
	protected.Get("/milestones/:id", sc.MilestoneHandler.GetMilestone)
	protected.Get("/escrows/:escrowId/milestones", sc.MilestoneHandler.GetMilestonesByEscrow)
	protected.Put("/milestones/:id", sc.MilestoneHandler.UpdateMilestone)
	protected.Put("/milestones/:id/submit", sc.MilestoneHandler.SubmitMilestone)
	protected.Put("/milestones/:id/approve", sc.MilestoneHandler.ApproveMilestone)
	protected.Put("/milestones/:id/reject", sc.MilestoneHandler.RejectMilestone)

	// Payment routes
	protected.Post("/payments/initiate", sc.PaymentHandler.InitiatePayment)
	protected.Get("/payments/transactions", sc.PaymentHandler.GetTransactions)
	
	// Chat routes
	protected.Get("/chat/ws/:id", websocket.New(sc.ChatHandler.HandleWebSocket))
	
	// Notification routes
	protected.Get("/notifications/ws", websocket.New(sc.NotificationHandler.HandleWebSocket))
}

// Export the service container for use in verification handler
func (sc *ServiceContainer) GetDB() *gorm.DB {
	return sc.DB
}