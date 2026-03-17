package handlers

import (
	"backend_monolithic/internal/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ContractHandler struct {
	DB *gorm.DB
}

func NewContractHandler(db *gorm.DB) *ContractHandler {
	return &ContractHandler{DB: db}
}

// AddContract adds a new contract to the database
func (h *ContractHandler) AddContract(c *fiber.Ctx) error {
	var contract models.Escrow
	if err := c.BodyParser(&contract); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	result := h.DB.Create(&contract)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(contract)
}

// GetContract retrieves a contract by ID
func (h *ContractHandler) GetContract(c *fiber.Ctx) error {
	id := c.Params("id")
	var contract models.Escrow

	result := h.DB.First(&contract, id)
	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Contract not found"})
	}

	return c.JSON(contract)
}
