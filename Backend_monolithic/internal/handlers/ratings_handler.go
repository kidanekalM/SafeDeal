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
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	escrowID, err := strconv.ParseUint(c.Params("escrowId"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid escrow ID"})
	}

	var req struct {
		RevieweeID uint   `json:"reviewee_id" validate:"required"`
		Rating     int    `json:"rating" validate:"required,oneof=1 2 3 4 5"`
		Comment    string `json:"comment"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Verify escrow exists and is completed, user participated
	var escrow models.Escrow
	if err := h.DB.Preload("Buyer").Preload("Seller").First(&escrow, uint(escrowID)).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Escrow not found"})
	}

	if escrow.Status != "Released" {
		return c.Status(400).JSON(fiber.Map{"error": "Can only review completed escrows"})
	}

	isBuyer := escrow.BuyerID == userID
	isSeller := escrow.SellerID == userID
	if !isBuyer && !isSeller {
		return c.Status(403).JSON(fiber.Map{"error": "Must participate in escrow to review"})
	}

	if req.RevieweeID != escrow.BuyerID && req.RevieweeID != escrow.SellerID {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot review this user for this escrow"})
	}

	// Prevent duplicate review
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

	// Recalculate reviewee trust score contribution
	h.recalculateTrustScore(req.RevieweeID)

	return c.JSON(review)
}

// GetUserReviews gets reviews for a user
func (h *RatingsHandler) GetUserReviews(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var reviews []models.Review
	if err := h.DB.Preload("Reviewer").Preload("Escrow").Where("reviewee_id = ?", uint(userID)).Find(&reviews).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch reviews"})
	}

	return c.JSON(reviews)
}

// GetUserReviewStats gets average rating for user
func (h *RatingsHandler) GetUserReviewStats(c *fiber.Ctx) error {
	userIDStr := c.Params("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	type RatingStats struct {
		AvgRating   float64
		ReviewCount int64
	}
	var stats RatingStats
	h.DB.Model(&models.Review{}).Where("reviewee_id = ?", uint(userID)).
		Select("AVG(rating) as avg_rating, COUNT(*) as review_count").
		Scan(&stats)

	return c.JSON(fiber.Map{
		"avg_rating":   stats.AvgRating,
		"review_count": stats.ReviewCount,
	})
}

// recalculateTrustScore updates trust score with new advanced rating algo
func (h *RatingsHandler) recalculateTrustScore(userID uint) error {
	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return err
	}

	var completed, disputed, refunded int64
	var totalVolume uint64
	
	// Fetch escrow stats
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Released").Count(&completed)
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Disputed").Count(&disputed)
	h.DB.Model(&models.Escrow{}).Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Refunded").Count(&refunded)
	
	// Calculate total volume (Released escrows)
	h.DB.Model(&models.Escrow{}).
		Where("(buyer_id = ? OR seller_id = ?) AND status = ?", userID, userID, "Released").
		Select("SUM(amount)").Scan(&totalVolume)

	// Fetch rating stats
	type RatingStats struct {
		AvgRating   float64
		ReviewCount int64
	}
	var ratingStats RatingStats
	h.DB.Model(&models.Review{}).Where("reviewee_id = ?", userID).
		Select("AVG(rating) as avg_rating, COUNT(*) as review_count").
		Scan(&ratingStats)

	// Advanced Multi-Factor Algorithm
	// 1. Base Score
	score := 65.0

	// 2. Escrow Performance (Weight: High)
	performanceBonus := float64(completed)*5.0 - float64(disputed)*20.0 - float64(refunded)*10.0
	score += performanceBonus

	// 3. User Ratings (Weight: Medium)
	if ratingStats.ReviewCount > 0 {
		// Normalize rating centered around 3.0
		ratingBonus := (ratingStats.AvgRating - 3.0) * 8.0
		score += ratingBonus
	}

	// 4. Volume Bonus (Weight: Low)
	// +1 point for every 50,000 ETB processed, capped at 10 points
	volumeBonus := float64(totalVolume) / 50000.0
	if volumeBonus > 10.0 {
		volumeBonus = 10.0
	}
	score += volumeBonus

	// 5. Activity/Longevity (Weight: Low)
	// Points for participating in many escrows even if not finished
	var totalParticipated int64
	h.DB.Model(&models.Escrow{}).Where("buyer_id = ? OR seller_id = ?", userID, userID).Count(&totalParticipated)
	activityBonus := float64(totalParticipated) * 0.5
	if activityBonus > 5.0 {
		activityBonus = 5.0
	}
	score += activityBonus

	// Constrain score to [0, 100]
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	return h.DB.Model(&user).Update("trust_score", score).Error
}
