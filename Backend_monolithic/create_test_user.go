package main

import (
    "backend_monolithic/configs"
    "backend_monolithic/internal/auth"
    "backend_monolithic/internal/models"
    "fmt"
    "log"
    // "os"
)

func main() {
    // os.Setenv("DATABASE_URL", "postgres://kidanekal:123456789@localhost:5432/safedeal_db?sslmode=disable")
    db := configs.InitDB()
    authService := auth.NewService(db)
    hashedPassword, _ := authService.HashPassword("Password123!")
    
    user := &models.User{
        FirstName:     "Test",
        LastName:      "Account",
        Email:         "test-account@safedeal.com",
        Password:      hashedPassword,
        Activated:     true,
        BankCode:      946,
        BankName:      "Commercial Bank of Ethiopia (CBE)",
        AccountNumber: "1000123456789",
        AccountName:   "Test Account",
    }
    
    var existing models.User
    if err := db.Where("email = ?", user.Email).First(&existing).Error; err != nil {
        if err := db.Create(user).Error; err != nil {
            log.Fatal(err)
        }
        fmt.Println("Test account created!")
    } else {
        fmt.Println("Test account already exists!")
    }
}
