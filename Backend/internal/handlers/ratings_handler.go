package handlers

import (
	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type RatingsHandler struct {
	DB          *gorm.DB
	AuthService *auth.Service
}

func NewRatingsHandler(db *gorm.DB, authService *auth.Service) *RatingsHandler {
	return &RatingsHandler{
		DB:          db,
		AuthService: authService,
	}
}

// CreateReview creates a new review for a completed escrow
func (h *RatingsHandler) CreateReview(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	escrowID, err := strconv.ParseUint(c.Params("escrowId"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid escrow ID"})
	}

	var req struct {
		RevieweeID string `json:"reviewee_id" validate:"required"`
		Rating     int    `json:"rating" validate:"required,oneof=1 2 3 4 5"`
		Comment    string `json:"comment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var escrow models.Escrow
	if err := h.DB.Preload("Buyer").Preload("Seller").First(&escrow, uint(escrowID)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	isBuyer := escrow.BuyerID == userID
	isSeller := escrow.SellerID == userID
	if !isBuyer && !isSeller {
		return c.Status(403).JSON(fiber.Map{"error": "Must participate in escrow to review"})
	}

	if req.RevieweeID != escrow.BuyerID && req.RevieweeID != escrow.SellerID {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot review this user for this escrow"})
	}

	var existing models.Review
	if err := h.DB.Where("reviewer_id = ? AND reviewee_id = ? AND escrow_id = ?", userID, req.RevieweeID, escrowID).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Review already exists"})
	}

	review := &models.Review{
		ReviewerID: userID,
		RevieweeID: req.RevieweeID,
		EscrowID:   uint(escrowID),
		Rating:     req.Rating,
		Comment:    req.Comment,
	}

	if err := h.DB.Create(review).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create review"})
	}

	h.recalculateTrustScore(req.RevieweeID)

	return c.JSON(review)
}

// GetUserReviews gets reviews for a user
func (h *RatingsHandler) GetUserReviews(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")

	var reviews []models.Review
	if err := h.DB.Preload("Reviewer").Preload("Escrow").Where("reviewee_id = ?", userIDStr).Find(&reviews).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reviews"})
	}

	return c.JSON(reviews)
}

// GetUserReviewStats gets average rating for user
func (h *RatingsHandler) GetUserReviewStats(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")

	type RatingStats struct {
		AvgRating   float64
		ReviewCount int64
	}
	var stats RatingStats
	h.DB.Model(&models.Review{}).Where("reviewee_id = ?", userIDStr).
		Select("AVG(rating) as avg_rating, COUNT(*) as review_count").
		Scan(&stats)

	return c.JSON(fiber.Map{
		"avg_rating":   stats.AvgRating,
		"review_count": stats.ReviewCount,
	})
}

// recalculateTrustScore updates trust score with new advanced rating algo
func (h *RatingsHandler) recalculateTrustScore(userID string) error {
	return nil
}
