package handlers

import (
	"log"
	"sync"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
	clients     map[uint]map[*websocket.Conn]bool // userId -> connections mapping
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
	handler := &NotificationHandler{
		DB:        db,
		clients:   make(map[uint]map[*websocket.Conn]bool),
		broadcast: make(chan NotificationData),
		register:  make(chan ClientConnection),
		unregister: make(chan *websocket.Conn),
	}

	// Start the hub
	go handler.runHub()

	return handler
}

func (h *NotificationHandler) runHub() {
	for {
		select {
		case clientConn := <-h.register:
			h.mutex.Lock()
			if _, ok := h.clients[clientConn.UserID]; !ok {
				h.clients[clientConn.UserID] = make(map[*websocket.Conn]bool)
			}
			h.clients[clientConn.UserID][clientConn.Conn] = true
			h.mutex.Unlock()

		case conn := <-h.unregister:
			h.mutex.Lock()
			for userID, userConnections := range h.clients {
				if _, ok := userConnections[conn]; ok {
					delete(userConnections, conn)
					conn.Close()
					
					// If no connections left for this user, remove the user map
					if len(userConnections) == 0 {
						delete(h.clients, userID)
					}
					break
				}
			}
			h.mutex.Unlock()

		case notification := <-h.broadcast:
			h.mutex.RLock()
			if userConnections, ok := h.clients[notification.UserID]; ok {
				for conn := range userConnections {
					if err := conn.WriteJSON(notification); err != nil {
						log.Printf("Error writing notification to WebSocket: %v", err)
						delete(userConnections, conn)
						conn.Close()
						
						// Check if no connections left for this user
						if len(userConnections) == 0 {
							delete(h.clients, notification.UserID)
						}
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *NotificationHandler) NotificationWebSocket(c *websocket.Conn) {
	// Get user ID from token in headers
	authHeader := c.Headers("authorization")
	if len(authHeader) <= 7 || authHeader[:7] != "Bearer " {
		log.Println("No valid authorization header found")
		return
	}

	token := authHeader[7:]
	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		log.Printf("Invalid token: %v", err)
		return
	}

	userID := claims.UserID

	// Register the connection
	clientConn := ClientConnection{
		Conn:   &c,
		UserID: userID,
	}
	h.register <- clientConn

	// Defer cleanup
	defer func() {
		h.unregister <- &c
	}()

	// Keep connection alive
	for {
		// Read message to detect disconnection
		var msg map[string]interface{}
		if err := c.ReadJSON(&msg); err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}
		// We don't really expect messages from the notification socket, just broadcasting
	}
}