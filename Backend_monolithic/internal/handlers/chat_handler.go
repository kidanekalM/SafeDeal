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

type ChatHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
	clients     map[*websocket.Conn]bool
	broadcast   chan MessageData
	register    chan *websocket.Conn
	unregister  chan *websocket.Conn
	mutex       sync.RWMutex
}

type MessageData struct {
	EscrowID uint   `json:"escrow_id"`
	SenderID uint   `json:"sender_id"`
	Content  string `json:"content"`
}

func NewChatHandler(db *gorm.DB, authService *auth.Service) *ChatHandler {
	handler := &ChatHandler{
		DB:          db,
		AuthService: authService,
		clients:     make(map[*websocket.Conn]bool),
		broadcast:   make(chan MessageData),
		register:    make(chan *websocket.Conn),
		unregister:  make(chan *websocket.Conn),
	}

	// Start the hub
	go handler.runHub()

	return handler
}

func (h *ChatHandler) runHub() {
	for {
		select {
		case conn := <-h.register:
			h.mutex.Lock()
			h.clients[conn] = true
			h.mutex.Unlock()

		case conn := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mutex.Unlock()

		case message := <-h.broadcast:
			h.mutex.RLock()
			for conn := range h.clients {
				if err := conn.WriteJSON(message); err != nil {
					log.Printf("Error writing to WebSocket: %v", err)
					delete(h.clients, conn)
					conn.Close()
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *ChatHandler) ChatWebSocket(c *websocket.Conn) {
	// Get user ID from token in query params or headers
	userIDFloat, ok := c.Locals("userID").(float64)
	if !ok {
		// Try to parse from token
		authHeader := c.Headers("authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token := authHeader[7:]
			claims, err := h.AuthService.ValidateToken(token)
			if err != nil {
				log.Printf("Invalid token: %v", err)
				return
			}
			userIDFloat = float64(claims.UserID)
		} else {
			log.Println("No valid user ID found")
			return
		}
	}

	userID := uint(userIDFloat)

	// Get target escrow ID from the connection params
	escrowID, err := h.getEscrowIDFromPath(c.Params("id"))
	if err != nil {
		log.Printf("Invalid escrow ID: %v", err)
		return
	}

	// Verify user is part of the escrow
	var escrow models.Escrow
	result := h.DB.First(&escrow, escrowID)
	if result.Error != nil {
		log.Printf("Escrow not found: %v", result.Error)
		return
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		log.Println("User not authorized for this escrow")
		return
	}

	// Register the connection
	h.register <- &c

	// Defer cleanup
	defer func() {
		h.unregister <- &c
	}()

	// Listen for messages
	for {
		var msg MessageData
		if err := c.ReadJSON(&msg); err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			break
		}

		// Verify this user can send messages in this escrow
		if msg.SenderID != userID || msg.EscrowID != escrowID {
			continue
		}

		// Save message to database
		message := models.Message{
			EscrowID:  msg.EscrowID,
			SenderID:  msg.SenderID,
			Content:   msg.Content,
			CreatedAt: "", // Will be set by GORM
		}

		if err := h.DB.Create(&message).Error; err != nil {
			log.Printf("Error saving message to database: %v", err)
			continue
		}

		// Broadcast the message
		h.broadcast <- msg
	}
}

func (h *ChatHandler) getEscrowIDFromPath(pathParam string) (uint, error) {
	// In a real implementation, you would convert the path param to uint
	// For now, just returning a dummy value
	var id uint = 1 // This should be properly parsed
	return id, nil
}