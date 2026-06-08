package mailer

import (
	"crypto/tls"
	"fmt"
	"os"
	"strconv"
	"strings"

	"gopkg.in/gomail.v2"
)

type Mailer struct {
	SMTPHost     string
	SMTPPort     int
	SMTPSenderEmail  string
	SMTPSenderName   string
	SMTPUsername string
	SMTPPassword string
}

func NewMailer() *Mailer {
	portStr := os.Getenv("SMTP_PORT")
	port, _ := strconv.Atoi(portStr)
	if port == 0 {
		port = 587
	}

	return &Mailer{
		SMTPHost:       getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:       port,
		SMTPSenderEmail: getEnv("SMTP_SENDER_EMAIL", "safedeal.no.reply@gmail.com"),
		SMTPSenderName:  "SafeDeal Team",
		SMTPUsername:    os.Getenv("SMTP_USERNAME"),
		SMTPPassword:    os.Getenv("SMTP_PASSWORD"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func (m *Mailer) SendEmail(to []string, subject, body string) error {
	msg := gomail.NewMessage()
	msg.SetHeader("From", fmt.Sprintf("%s <%s>", m.SMTPSenderName, m.SMTPSenderEmail))
	msg.SetHeader("To", strings.Join(to, ", "))
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/html", body)

	dialer := gomail.NewDialer(m.SMTPHost, m.SMTPPort, m.SMTPUsername, m.SMTPPassword)
	dialer.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	return dialer.DialAndSend(msg)
}

func (m *Mailer) SendEscrowUpdate(escrowID uint, status string, buyerEmail, sellerEmail string, amount float64) error {
	subject := fmt.Sprintf("Escrow #%d Status Update: %s", escrowID, status)
	body := fmt.Sprintf(`
<h1>SafeDeal Escrow Update</h1>
<p>Escrow #%d has been updated to status: <strong>%s</strong></p>
<p>Amount: ETB %.2f</p>
<p><a href="http://localhost:8080/escrow/%d">View Escrow</a></p>
`, escrowID, status, amount, escrowID)

	return m.SendEmail([]string{buyerEmail, sellerEmail}, subject, body)
}