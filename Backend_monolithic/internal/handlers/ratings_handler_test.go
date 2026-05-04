package handlers

import (
	"backend_monolithic/internal/auth"
	"backend_monolithic/internal/models"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestRecalculateTrustScore(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	db.AutoMigrate(&models.User{}, &models.Review{}, &models.Escrow{})

	authSvc := auth.NewService(db)
	h := NewRatingsHandler(db, authSvc)

	user := models.User{TrustScore: 65.0}
	db.Create(&user)

	// Add positive review
	db.Create(&models.Review{RevieweeID: user.ID, Rating: 5})

	h.recalculateTrustScore(user.ID)

	var updatedUser models.User
	db.First(&updatedUser, user.ID)
	if updatedUser.TrustScore <= 65.0 {
		t.Errorf("Trust score should increase")
	}
}
