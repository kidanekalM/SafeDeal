package handlers

import (
	"log"
	"sync"

	"backend_monolithic/internal/auth"
	"backend_monolithic/pkg/mailer"

	"github.com/gofiber/websocket/v2"
	"fmt"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
	clients     map[uint]map[*websocket.Conn]bool
	broadcast   chan NotificationData
	register    chan ClientConnection
	unregister  chan *websocket.Conn
	mutex       sync.RWMutex
}

type NotificationData struct {
	UserID  uint   `json:"user_id"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

type ClientConnection struct {
	Conn   *websocket.Conn
	UserID uint
}

func NewNotificationHandler(db *gorm.DB, authService *auth.Service) *NotificationHandler {
	h := &NotificationHandler{
		DB:          db,
		AuthService: authService,
		clients:     make(map[uint]map[*websocket.Conn]bool),
		broadcast:   make(chan NotificationData),
		register:    make(chan ClientConnection),
		unregister:  make(chan *websocket.Conn),
	}
	go h.runHub()
	return h
}

func (h *NotificationHandler) runHub() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			if _, ok := h.clients[client.UserID]; !ok {
				h.clients[client.UserID] = make(map[*websocket.Conn]bool)
			}
			h.clients[client.UserID][client.Conn] = true
			h.mutex.Unlock()

		case conn := <-h.unregister:
			h.mutex.Lock()
			for uid, conns := range h.clients {
				if _, ok := conns[conn]; ok {
					delete(conns, conn)
					if len(conns) == 0 {
						delete(h.clients, uid)
					}
				}
			}
			h.mutex.Unlock()

		case n := <-h.broadcast:
			h.mutex.RLock()
			if conns, ok := h.clients[n.UserID]; ok {
				for conn := range conns {
					if conn != nil {
						if err := conn.WriteJSON(n); err != nil {
							delete(conns, conn)
						}
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *NotificationHandler) HandleWebSocket(c *websocket.Conn) {
	h.NotificationWebSocket(c)
}

func (h *NotificationHandler) NotificationWebSocket(c *websocket.Conn) {
	// Extract token from locals
	token, ok := c.Locals("token").(string)
	if !ok || token == "" {
		log.Println("missing auth token in websocket locals")
		return
	}

	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		log.Println("invalid token:", err)
		return
	}

	h.register <- ClientConnection{
		Conn:   c,
		UserID: claims.UserID,
	}

	defer func() { h.unregister <- c }()

	for {
		var msg map[string]interface{}
		if err := c.ReadJSON(&msg); err != nil {
			break
		}
	}
}

// InviteUser sends real email invitation to non-existent user
func (h *NotificationHandler) InviteUser(email string) {
	mailer := mailer.NewMailer()
	subject := "Join SafeDeal - You've been invited to an escrow deal"
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>SafeDeal Invitation</title>
</head>
<body>
    <h1>You've been invited to SafeDeal!</h1>
    <p>A SafeDeal escrow has been created for you.</p>
    <p><a href="http://localhost:8080/login?mode=register">Create Account & Accept</a></p>
    <p>Reply to this email if you have questions.</p>
</body>
</html>
`
	if err := mailer.SendEmail([]string{email}, subject, html); err != nil {
		log.Printf("Failed to send invite to %s: %v", email, err)
	} else {
		log.Printf("Invitation email sent to %s", email)
	}
}

func (h *NotificationHandler) SendEscrowUpdate(escrowID uint, status string, buyerEmail, sellerEmail string, amount uint) {
	mailer := mailer.NewMailer()
	subject := fmt.Sprintf("SafeDeal Escrow #%d Update: %s", escrowID, status)
	html := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
		    <title>SafeDeal Escrow Update</title>
		</head>
		<body>
		    <h1>Escrow #%d Status Update</h1>
		    <p>Status changed to: <strong>%s</strong></p>
		    <p>Amount: %d ETB</p>
		    <p><a href="http://localhost:8080/escrow/%d">View Escrow Details</a></p>
		</body>
		</html>
	`, escrowID, status, amount, escrowID)
	
	if err := mailer.SendEmail([]string{buyerEmail, sellerEmail}, subject, html); err != nil {
		log.Printf("Failed to send escrow update: %v", err)
	}
}

func (h *NotificationHandler) SendActivationEmail(email string, code string) {
	mailer := mailer.NewMailer()
	subject := "SafeDeal - Activate Your Account"
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>SafeDeal Activation</title>
</head>
<body>
    <h1>Welcome to SafeDeal!</h1>
    <p>Please use the following code to activate your account:</p>
    <h2 style="background: #f4f4f4; padding: 10px; display: inline-block;">%s</h2>
    <p>Or click the link below:</p>
    <p><a href="http://localhost:8080/activate?email=%s&code=%s">Activate Account</a></p>
</body>
</html>
`, code, email, code)

	if err := mailer.SendEmail([]string{email}, subject, html); err != nil {
		log.Printf("Failed to send activation email to %s: %v", email, err)
	} else {
		log.Printf("Activation email sent to %s", email)
	}
}


