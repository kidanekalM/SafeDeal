package handlers

import (
	"log"
	"sync"

	"backend_monolithic/internal/auth"
	"github.com/gofiber/websocket/v2"
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

// InviteUser simulates sending an invitation to a non-existent user
func (h *NotificationHandler) InviteUser(email string) {
	log.Printf("INVITATION SENT: User with email %s has been invited to join SafeDeal", email)
	// In a real implementation, this would trigger an email via a mailer service
}
