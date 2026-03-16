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
	DB                  *gorm.DB
	AuthService         *auth.Service
	UserHandler         *handlers.UserHandler
	EscrowHandler       *handlers.EscrowHandler
	PaymentHandler      *handlers.PaymentHandler
	ChatHandler         *handlers.ChatHandler
	NotificationHandler *handlers.NotificationHandler
	MilestoneHandler    *handlers.MilestoneHandler
}

func NewServiceContainer(db *gorm.DB, rabbitMQ *rabbitmq.Producer) *ServiceContainer {
	authService := auth.NewService(db)
	blockchainClient, err := blockchain.NewClient() // Actual implementation
	if err != nil {
		panic(err) // Handle error appropriately in production
	}

	return &ServiceContainer{
		DB:                  db,
		AuthService:         authService,
		UserHandler:         handlers.NewUserHandler(db, authService),
		EscrowHandler:       handlers.NewEscrowHandler(db, authService, rabbitMQ, blockchainClient),
		PaymentHandler:      handlers.NewPaymentHandler(db, authService, rabbitMQ),
		ChatHandler:         handlers.NewChatHandler(db, authService),
		NotificationHandler: handlers.NewNotificationHandler(db, authService),
		MilestoneHandler:    handlers.NewMilestoneHandler(db),
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
	protected.Get("/profile", sc.UserHandler.GetProfile)  // 添加缺失的路由
	protected.Put("/profile", sc.UserHandler.UpdateProfile)
	protected.Put("/bank-details", sc.UserHandler.UpdateBankDetails)
	
	// Escrow routes
	protected.Post("/escrows", sc.EscrowHandler.CreateEscrow)
	protected.Get("/escrows/:id", sc.EscrowHandler.GetEscrowByID)
	protected.Get("/escrows/my", sc.EscrowHandler.GetMyEscrows)  // 确保此路由存在
	protected.Put("/escrows/:id/accept", sc.EscrowHandler.AcceptEscrow)
	protected.Put("/escrows/:id/cancel", sc.EscrowHandler.CancelEscrow)
	protected.Put("/escrows/:id/confirm-receipt", sc.EscrowHandler.ConfirmReceipt)
	protected.Post("/escrows/:id/dispute", sc.EscrowHandler.CreateDispute)
	protected.Get("/escrows/:id/dispute", sc.EscrowHandler.GetDispute)
	protected.Put("/escrows/:id/refund", sc.EscrowHandler.RefundEscrow)
	protected.Get("/escrows/contacts", sc.EscrowHandler.GetEscrowContacts)

	// Search route - 添加缺失的路由
	protected.Get("/search", sc.UserHandler.SearchUsers)

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
