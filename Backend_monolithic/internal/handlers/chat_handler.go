package handlers

import (
	"fmt"
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
	h := &ChatHandler{
		DB:          db,
		AuthService: authService,
		clients:     make(map[*websocket.Conn]bool),
		broadcast:   make(chan MessageData),
		register:    make(chan *websocket.Conn),
		unregister:  make(chan *websocket.Conn),
	}
	go h.runHub()
	return h
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
			delete(h.clients, conn)
			conn.Close()
			h.mutex.Unlock()

		case msg := <-h.broadcast:
			h.mutex.RLock()
			for conn := range h.clients {
				if err := conn.WriteJSON(msg); err != nil {
					conn.Close()
					delete(h.clients, conn)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *ChatHandler) HandleWebSocket(c *websocket.Conn) {
	h.ChatWebSocket(c)
}

func (h *ChatHandler) ChatWebSocket(c *websocket.Conn) {

	// Get HTTP context
	ctx := c.Locals("fiberCtx").(*fiber.Ctx)

	// Extract token
	authHeader := ctx.Get("Authorization")
	if len(authHeader) <= 7 || authHeader[:7] != "Bearer " {
		log.Println("missing auth header")
		return
	}

	token := authHeader[7:]
	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		log.Println("invalid token:", err)
		return
	}
	userID := claims.UserID

	// escrow id
	escrowID, err := h.getEscrowIDFromPath(ctx.Params("id"))
	if err != nil {
		log.Println("invalid escrow id:", err)
		return
	}

	var escrow models.Escrow
	if err := h.DB.First(&escrow, escrowID).Error; err != nil {
		log.Println("escrow not found")
		return
	}

	if escrow.BuyerID != userID && escrow.SellerID != userID {
		log.Println("not authorized")
		return
	}

	h.register <- c
	defer func() { h.unregister <- c }()

	for {
		var msg MessageData
		if err := c.ReadJSON(&msg); err != nil {
			break
		}

		if msg.SenderID != userID || msg.EscrowID != escrowID {
			continue
		}

		message := models.Message{
			EscrowID: msg.EscrowID,
			SenderID: msg.SenderID,
			Content:  msg.Content,
		}

		if err := h.DB.Create(&message).Error; err != nil {
			continue
		}

		h.broadcast <- msg
	}
}

func (h *ChatHandler) getEscrowIDFromPath(id string) (uint, error) {
	var parsed uint
	_, err := fmt.Sscan(id, &parsed)
	return parsed, err
}
