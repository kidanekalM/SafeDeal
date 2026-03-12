package handlers

import (
	"log"
	"sync"
	"time"

	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"github.com/gofiber/fiber/v2"
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
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
	Metadata  string    `json:"metadata,omitempty"`
}

type ClientConnection struct {
	Conn   *websocket.Conn
	UserID uint
}

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
	ID   interface{} `json:"id,omitempty"`
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
					conn.Close()
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
					if err := conn.WriteJSON(n); err != nil {
						conn.Close()
						delete(conns, conn)
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
	// Get HTTP context - similar to how ChatHandler does it
	ctxValue := c.Locals("fiberCtx")
	if ctxValue == nil {
		log.Println("missing fiberCtx in WebSocket connection locals")
		return
	}

	ctx, ok := ctxValue.(*fiber.Ctx)
	if !ok {
		log.Println("could not convert context to fiber Ctx")
		return
	}

	// Extract token
	authHeader := ctx.Get("Authorization")
	if authHeader == "" {
		log.Println("missing Authorization header in WebSocket request")
		return
	}

	if len(authHeader) <= 7 || authHeader[:7] != "Bearer " {
		log.Println("invalid Authorization header format")
		return
	}

	token := authHeader[7:]
	claims, err := h.AuthService.ValidateToken(token)
	if err != nil {
		log.Printf("invalid token: %v", err)
		return
	}

	// Make sure the user ID is valid
	if claims.UserID == 0 {
		log.Println("invalid user ID in token claims")
		return
	}

	h.register <- ClientConnection{
		Conn:   c,
		UserID: claims.UserID,
	}

	defer func() { 
		h.unregister <- c 
	}()

	for {
		var msg WebSocketMessage
		if err := c.ReadJSON(&msg); err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			// Don't break here, as ReadJSON can return temporary errors
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				break
			}
			continue
		}

		switch msg.Type {
		case "get_history":
			h.sendNotificationHistory(c, claims.UserID)
		case "mark_read":
			h.markNotificationAsRead(c, msg.ID, claims.UserID)
		}
	}
}

// Send notification history to the connected client
func (h *NotificationHandler) sendNotificationHistory(conn *websocket.Conn, userID uint) {
	var notifications []models.Notification
	result := h.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications)
	if result.Error != nil {
		log.Printf("Error fetching notification history: %v", result.Error)
		return
	}

	// Convert models.Notification to NotificationData
	notificationData := make([]NotificationData, len(notifications))
	for i, n := range notifications {
		notificationData[i] = NotificationData{
			ID:        n.ID,
			UserID:    n.UserID,
			Type:      n.Type,
			Title:     n.Title,
			Message:   n.Message,
			Read:      n.Read,
			CreatedAt: n.CreatedAt,
			Metadata:  n.Metadata,
		}
	}

	response := WebSocketMessage{
		Type: "history",
		Data: notificationData,
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Error sending notification history: %v", err)
	}
}

// Mark notification as read
func (h *NotificationHandler) markNotificationAsRead(conn *websocket.Conn, id interface{}, userID uint) {
	var notificationID uint
	
	// Handle different types of ID values
	switch v := id.(type) {
	case float64:
		notificationID = uint(v)
	case int:
		notificationID = uint(v)
	case uint:
		notificationID = v
	case string:
		// If it's a string ID, we'd need to parse it differently
		// For now, we'll skip string IDs as they shouldn't occur in our system
		return
	default:
		log.Printf("Unsupported ID type: %T", v)
		return
	}

	// Update the notification as read
	var notification models.Notification
	result := h.DB.Where("user_id = ? AND id = ?", userID, notificationID).First(&notification)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("Notification not found: %d", notificationID)
		} else {
			log.Printf("Error finding notification: %v", result.Error)
		}
		return
	}

	notification.Read = true
	if err := h.DB.Save(&notification).Error; err != nil {
		log.Printf("Error updating notification as read: %v", err)
		return
	}

	// Send confirmation back to client
	response := WebSocketMessage{
		Type: "mark_read_response",
		ID:   notificationID,
		Data: map[string]interface{}{
			"success": true,
			"id":      notificationID,
		},
	}

	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Error sending mark_read_response: %v", err)
	}
}

// Create a new notification and broadcast it to the user
func (h *NotificationHandler) CreateNotification(userID uint, notificationType, title, message string) error {
	notification := models.Notification{
		UserID:  userID,
		Type:    notificationType,
		Title:   title,
		Message: message,
		Read:    false,
	}

	if err := h.DB.Create(&notification).Error; err != nil {
		return err
	}

	// Prepare notification data for broadcasting
	notificationData := NotificationData{
		ID:        notification.ID,
		UserID:    notification.UserID,
		Type:      notification.Type,
		Title:     notification.Title,
		Message:   notification.Message,
		Read:      notification.Read,
		CreatedAt: notification.CreatedAt,
		Metadata:  notification.Metadata,
	}

	// Broadcast the notification to the user's connected clients
	h.broadcast <- notificationData

	return nil
}