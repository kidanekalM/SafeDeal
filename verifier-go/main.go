package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/labstack/echo/v4"
	"github.com/labstack/egomiddleware"
)

// UniversalVerifyRequest represents the request body for the universal verification endpoint
type UniversalVerifyRequest struct {
	Reference   string `json:"reference"`
	Suffix      string `json:"suffix,omitempty"`
	PhoneNumber string `json:"phoneNumber,omitempty"`
}

// VerifyResponse represents the response from verification endpoints
type VerifyResponse struct {
	Success bool                   `json:"success"`
	Error   string                 `json:"error,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

// TransactionDetails holds extracted transaction information
type TransactionDetails struct {
	FullText      string  `json:"full_text"`
	Amount        float64 `json:"amount,omitempty"`
	Payer         string  `json:"payer,omitempty"`
	Receiver      string  `json:"receiver,omitempty"`
	Reference     string  `json:"reference,omitempty"`
	PayerAccount  string  `json:"payer_account,omitempty"`
	ReceiverAccount string `json:"receiver_account,omitempty"`
	Reason        string  `json:"reason,omitempty"`
	Date          string  `json:"date,omitempty"`
}

func main() {
	e := echo.New()
	e.Use(egomiddleware.Logger())
	e.Use(egomiddleware.Recover())

	// Define routes
	e.POST("/verify/universal", verifyUniversal)
	e.POST("/verify/pdf", verifyFromPDF)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Starting server on port %s", port)
	e.Start(":" + port)
}

// verifyUniversal handles the universal verification endpoint
func verifyUniversal(c echo.Context) error {
	var req UniversalVerifyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, VerifyResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if req.Reference == "" || !isValidString(req.Reference) {
		return c.JSON(http.StatusBadRequest, VerifyResponse{
			Success: false,
			Error:   "Missing or invalid reference.",
		})
	}

	trimmedRef := strings.TrimSpace(req.Reference)
	lenRef := len(trimmedRef)

	// Reject immediately if the length does not match any known provider
	if lenRef != 10 && lenRef != 12 && lenRef != 16 {
		return c.JSON(http.StatusBadRequest, VerifyResponse{
			Success: false,
			Error:   "Invalid reference length for automatic sorting.",
		})
	}

	var result TransactionDetails
	var err error

	// --- DASHEN BANK ---
	// 16 characters, starts with 3 digits
	if lenRef == 16 && regexp.MustCompile(`^\d{3}`).MatchString(trimmedRef) {
		if req.Suffix != "" || req.PhoneNumber != "" {
			return c.JSON(http.StatusBadRequest, VerifyResponse{
				Success: false,
				Error:   "Dashen bank verification expects only a reference number. Exclude suffix and phoneNumber.",
			})
		}
		result, err = verifyDashen(trimmedRef)
	}

	// --- CBE & ABYSSINIA ---
	// 12 characters, starts with 'FT'
	else if lenRef == 12 && strings.HasPrefix(strings.ToUpper(trimmedRef), "FT") {
		if req.Suffix == "" {
			return c.JSON(http.StatusBadRequest, VerifyResponse{
				Success: false,
				Error:   "Transactions starting with \"FT\" require a suffix (8 digits for CBE, 5 digits for Abyssinia).",
			})
		}

		trimmedSuffix := strings.TrimSpace(req.Suffix)

		if len(trimmedSuffix) == 8 {
			// CBE
			result, err = verifyCBE(trimmedRef, trimmedSuffix)
		} else if len(trimmedSuffix) == 5 {
			// Abyssinia
			result, err = verifyAbyssinia(trimmedRef, trimmedSuffix)
		} else {
			return c.JSON(http.StatusBadRequest, VerifyResponse{
				Success: false,
				Error:   "Suffix must be exactly 8 digits (CBE) or 5 digits (Abyssinia).",
			})
		}
	}

	// --- CBE BIRR & TELEBIRR ---
	// 10 alphanumeric characters
	else if lenRef == 10 {
		// Must be strictly alphanumeric
		if !regexp.MustCompile(`^[A-Za-z0-9]{10}$`).MatchString(trimmedRef) {
			return c.JSON(http.StatusBadRequest, VerifyResponse{
				Success: false,
				Error:   "10-character reference must be alphanumeric.",
			})
		}

		// Strictly forbid a suffix here
		if req.Suffix != "" {
			return c.JSON(http.StatusBadRequest, VerifyResponse{
				Success: false,
				Error:   "Suffix is not expected for 10-character transactions.",
			})
		}

		if req.PhoneNumber != "" {
			// CBE Birr Verification
			trimmedPhone := strings.TrimSpace(req.PhoneNumber)

			// Basic Ethiopian Phone Number Validation check
			if !strings.HasPrefix(trimmedPhone, "251") || len(trimmedPhone) > 12 || len(trimmedPhone) < 10 {
				return c.JSON(http.StatusBadRequest, VerifyResponse{
					Success: false,
					Error:   "Invalid phone number format. Must start with 251 and be 12 digits long.",
				})
			}

			// For now, we'll simulate CBE Birr verification
			result, err = verifyCBEBirr(trimmedRef, trimmedPhone)
		} else {
			// Telebirr Verification (No phone number provided)
			result, err = verifyTelebirr(trimmedRef)
			if result.FullText == "" {
				return c.JSON(http.StatusNotFound, VerifyResponse{
					Success: false,
					Error:   "Receipt not found or could not be processed.",
				})
			}
		}
	}

	if err != nil {
		return c.JSON(http.StatusInternalServerError, VerifyResponse{
			Success: false,
			Error:   fmt.Sprintf("Server error verifying payment: %v", err),
		})
	}

	return c.JSON(http.StatusOK, VerifyResponse{
		Success: true,
		Data: map[string]interface{}{
			"full_text":       result.FullText,
			"amount":          result.Amount,
			"payer":           result.Payer,
			"receiver":        result.Receiver,
			"reference":       result.Reference,
			"payer_account":   result.PayerAccount,
			"receiver_account": result.ReceiverAccount,
			"reason":          result.Reason,
			"date":            result.Date,
		},
	})
}

// verifyFromPDF handles verification from uploaded PDF files
func verifyFromPDF(c echo.Context) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return c.JSON(http.StatusBadRequest, VerifyResponse{
			Success: false,
			Error:   "Unable to parse form data",
		})
	}

	files := form.File["pdf"]
	if len(files) == 0 {
		return c.JSON(http.StatusBadRequest, VerifyResponse{
			Success: false,
			Error:   "No PDF file provided",
		})
	}

	file := files[0]
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, VerifyResponse{
			Success: false,
			Error:   "Unable to open file",
		})
	}
	defer src.Close()

	// Create temporary file
	tempFile, err := os.CreateTemp("", "pdf_verify_*.pdf")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, VerifyResponse{
			Success: false,
			Error:   "Unable to create temp file",
		})
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Copy uploaded file to temp file
	_, err = io.Copy(tempFile, src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, VerifyResponse{
			Success: false,
			Error:   "Unable to save file",
		})
	}

	// Extract text from PDF
	text, err := extractTextFromPDF(tempFile.Name())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, VerifyResponse{
			Success: false,
			Error:   fmt.Sprintf("Error extracting text from PDF: %v", err),
		})
	}

	// Try to identify the transaction type and extract details
	transactionDetails := extractTransactionDetails(text)

	return c.JSON(http.StatusOK, VerifyResponse{
		Success: true,
		Data: map[string]interface{}{
			"full_text":       transactionDetails.FullText,
			"amount":          transactionDetails.Amount,
			"payer":           transactionDetails.Payer,
			"receiver":        transactionDetails.Receiver,
			"reference":       transactionDetails.Reference,
			"payer_account":   transactionDetails.PayerAccount,
			"receiver_account": transactionDetails.ReceiverAccount,
			"reason":          transactionDetails.Reason,
			"date":            transactionDetails.Date,
		},
	})
}

// extractTextFromPDF extracts text from a PDF file
func extractTextFromPDF(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var fullText string
	totalPages := r.NumPage()

	for i := 0; i < totalPages; i++ {
		page := r.Page(i + 1)
		if page.V.IsNull() {
			continue
		}
		
		text, err := page.GetAllContent()
		if err != nil {
			continue
		}
		
		fullText += text.ToText()
	}

	return fullText, nil
}

// extractTransactionDetails tries to extract transaction details from text
func extractTransactionDetails(text string) TransactionDetails {
	// This is a simplified extraction - in a real implementation you'd have more sophisticated parsing
	details := TransactionDetails{
		FullText: text,
	}

	// Look for common patterns in transaction details
	amountPattern := regexp.MustCompile(`(?i)(?:amount|total)[:\s]*([$€£¥]?\s*\d{1,3}(?:[,.]?\d{3})*(?:[,.]\d{2}))`)
	amountMatches := amountPattern.FindStringSubmatch(text)
	if len(amountMatches) > 1 {
		amountStr := strings.ReplaceAll(amountMatches[1], ",", "")
		amountStr = strings.ReplaceAll(amountStr, " ", "")
		if amount, err := strconv.ParseFloat(regexp.MustCompile(`[\d.]+`).FindString(amountStr), 64); err == nil {
			details.Amount = amount
		}
	}

	// Look for reference patterns
	refPattern := regexp.MustCompile(`(?i)(?:ref(?:erence)?|transaction[-_\s]*id|receipt[-_\s]*id)[:\s]*([A-Z0-9\-]{8,20})`)
	refMatches := refPattern.FindStringSubmatch(text)
	if len(refMatches) > 1 {
		details.Reference = strings.TrimSpace(refMatches[1])
	}

	// Look for payer/receiver patterns
	payerPattern := regexp.MustCompile(`(?i)(?:paid[-_\s]*by|payer|sender)[:\s]*([A-Z\s]+)`)
	payerMatches := payerPattern.FindStringSubmatch(text)
	if len(payerMatches) > 1 {
		details.Payer = strings.TrimSpace(payerMatches[1])
	}

	receiverPattern := regexp.MustCompile(`(?i)(?:paid[-_\s]*to|receiver|beneficiary)[:\s]*([A-Z\s]+)`)
	receiverMatches := receiverPattern.FindStringSubmatch(text)
	if len(receiverMatches) > 1 {
		details.Receiver = strings.TrimSpace(receiverMatches[1])
	}

	// Look for date patterns
	datePattern := regexp.MustCompile(`(?i)(?:date|time)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|[0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})`)
	dateMatches := datePattern.FindStringSubmatch(text)
	if len(dateMatches) > 1 {
		details.Date = strings.TrimSpace(dateMatches[1])
	}

	return details
}

// verifyCBE simulates CBE verification
func verifyCBE(reference, suffix string) (TransactionDetails, error) {
	// In a real implementation, this would call the CBE verification API
	// For now, we'll simulate by extracting details from a PDF if one exists
	text := fmt.Sprintf("CBE Transaction: %s-%s", reference, suffix)
	return TransactionDetails{
		FullText: text,
		Reference: fmt.Sprintf("%s-%s", reference, suffix),
	}, nil
}

// verifyAbyssinia simulates Abyssinia verification
func verifyAbyssinia(reference, suffix string) (TransactionDetails, error) {
	// In a real implementation, this would call the Abyssinia verification API
	text := fmt.Sprintf("Abyssinia Transaction: %s-%s", reference, suffix)
	return TransactionDetails{
		FullText: text,
		Reference: fmt.Sprintf("%s-%s", reference, suffix),
	}, nil
}

// verifyDashen simulates Dashen verification
func verifyDashen(reference string) (TransactionDetails, error) {
	// In a real implementation, this would call the Dashen verification API
	text := fmt.Sprintf("Dashen Transaction: %s", reference)
	return TransactionDetails{
		FullText: text,
		Reference: reference,
	}, nil
}

// verifyCBEBirr simulates CBE Birr verification
func verifyCBEBirr(reference, phoneNumber string) (TransactionDetails, error) {
	// In a real implementation, this would call the CBE Birr verification API
	text := fmt.Sprintf("CBE Birr Transaction: %s, Phone: %s", reference, phoneNumber)
	return TransactionDetails{
		FullText: text,
		Reference: reference,
	}, nil
}

// verifyTelebirr simulates Telebirr verification
func verifyTelebirr(reference string) (TransactionDetails, error) {
	// In a real implementation, this would call the Telebirr verification API
	text := fmt.Sprintf("Telebirr Transaction: %s", reference)
	return TransactionDetails{
		FullText: text,
		Reference: reference,
	}, nil
}

// isValidString checks if a string is valid (not empty and not containing control characters)
func isValidString(s string) bool {
	if s == "" {
		return false
	}
	
	// Check for control characters
	for _, r := range s {
		if r < 32 && r != 9 && r != 10 && r != 13 { // Allow tabs, newlines, carriage returns
			return false
		}
	}
	return true
}