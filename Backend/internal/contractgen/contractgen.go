package contractgen

import (
	"fmt"
	"strings"
	"time"

	"backend_monolithic/internal/models"
)

// Generate renders a structured escrow into a printable contract document.
// It branches on escrow.EscrowType: "item" produces a Sales & Purchase style
// agreement, "project" produces a Milestone Payment terms agreement. Shared
// escrow skeleton clauses apply to both.
func Generate(escrow *models.Escrow) string {
	partyName := func(u *models.User) string {
		if u == nil {
			return "____________________"
		}
		name := strings.TrimSpace(u.FirstName + " " + u.LastName)
		if name == "" {
			return "____________________"
		}
		return name
	}
	partyEmail := func(u *models.User) string {
		if u == nil {
			return ""
		}
		return u.Email
	}

	buyer := partyName(escrow.Buyer)
	seller := partyName(escrow.Seller)
	mediator := partyName(escrow.Mediator)
	mediatorEmail := partyEmail(escrow.Mediator)

	effectiveDate := time.Now().Format("January 2, 2006")
	deliveryDate := ""
	if escrow.DeliveryDate != nil {
		deliveryDate = escrow.DeliveryDate.Format("January 2, 2006")
	}
	amount := formatAmount(escrow.Amount)

	var b strings.Builder
	b.WriteString("================================================================\n")
	b.WriteString("                  SAFEDEAL ESCROW AGREEMENT\n")
	b.WriteString("================================================================\n\n")
	b.WriteString("Agreement Type: " + agreementTypeLabel(escrow) + "\n")
	b.WriteString("Agreement ID: " + fmt.Sprintf("%d", escrow.ID) + "\n")
	b.WriteString("Version: " + contractVersion(escrow) + "\n")
	b.WriteString("Effective Date: " + effectiveDate + "\n\n")

	// 1. PARTIES
	b.WriteString("1. PARTIES TO THE AGREEMENT\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString("Buyer (Depositor): " + buyer + " <" + partyEmail(escrow.Buyer) + ">\n")
	b.WriteString("Seller (Beneficiary): " + seller + " <" + partyEmail(escrow.Seller) + ">\n")
	if escrow.MediatorID != nil {
		b.WriteString("Mediator: " + mediator + " <" + mediatorEmail + ">\n")
	}
	b.WriteString("\n")

	// 2. RECITALS
	b.WriteString("2. RECITALS\n")
	b.WriteString("----------------------------------------------------------------\n")
	recital := escrow.Description
	if strings.TrimSpace(recital) == "" {
		recital = escrow.Title
	}
	b.WriteString("This Escrow Agreement is entered into effective " + effectiveDate +
		" between the Buyer and the Seller for the amount of " + amount +
		" ETB in connection with: " + escrow.Title + ".\n")
	if strings.TrimSpace(recital) != "" {
		b.WriteString("Background: " + recital + "\n")
	}
	b.WriteString("\n")

	// 3. ESCROW-SPECIFIC / TRANSACTION TERMS
	b.WriteString("3. ESCROW TERMS\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString("Escrow Type: " + agreementTypeLabel(escrow) + "\n")
	b.WriteString("Total Amount: " + amount + " ETB\n")
	b.WriteString("Platform Fee: " + formatAmount(escrow.PlatformFee) + " ETB\n")
	b.WriteString("Net Amount to Seller: " + formatAmount(subAmount(escrow.Amount, escrow.PlatformFee)) + " ETB\n")
	if deliveryDate != "" {
		b.WriteString("Expected Delivery/Completion Date: " + deliveryDate + "\n")
	}
	b.WriteString("Inspection Period: " + fmt.Sprintf("%d", escrow.InspectionPeriod) + " day(s)\n")
	if escrow.AutoRelease {
		b.WriteString("Auto-Release: Funds shall be released automatically if no dispute is raised within the inspection period.\n")
	}
	b.WriteString("\n")

	switch escrow.EscrowType {
	case "project":
		b.WriteString("MILESTONE PAYMENT TERMS\n")
		b.WriteString("----------------------------------------------------------------\n")
		if len(escrow.Milestones) == 0 {
			b.WriteString("The Total Amount shall be released upon completion of the full scope of work.\n")
		} else {
			b.WriteString("The Total Amount is split into the following milestones, each released upon its verified completion:\n\n")
			for i, m := range escrow.Milestones {
				b.WriteString(fmt.Sprintf("  Milestone %d: %s\n", i+1, m.Title))
				b.WriteString(fmt.Sprintf("    Amount: %s ETB\n", formatAmount(m.Amount)))
				if m.DueDate != nil && *m.DueDate != "" {
					b.WriteString("    Due Date: " + *m.DueDate + "\n")
				}
				b.WriteString(fmt.Sprintf("    Completion Type: %s\n", completionTypeLabel(m.CompletionType)))
				b.WriteString(fmt.Sprintf("    Verification Authority: %s\n", verificationLabel(m.VerificationAuthority)))
				b.WriteString(fmt.Sprintf("    Release Trigger: %s\n", releaseTriggerLabel(m.ReleaseTrigger)))
				if strings.TrimSpace(m.AcceptanceCriteria) != "" {
					b.WriteString("    Acceptance Criteria: " + m.AcceptanceCriteria + "\n")
				}
				if strings.TrimSpace(m.RejectionConditions) != "" {
					b.WriteString("    Rejection Conditions: " + m.RejectionConditions + "\n")
				}
				b.WriteString("\n")
			}
		}
	default:
		b.WriteString("SALES & PURCHASE TERMS\n")
		b.WriteString("----------------------------------------------------------------\n")
		b.WriteString("Subject: " + escrow.Title + "\n")
		if strings.TrimSpace(escrow.Description) != "" {
			b.WriteString("Description of Goods/Services: " + escrow.Description + "\n")
		}
		b.WriteString("Purchase Price: " + amount + " ETB, payable into escrow.\n")
		b.WriteString("Risk of Loss: The Seller bears risk of loss until delivery is confirmed by the Buyer.\n")
		b.WriteString("Acceptance: The Buyer has " + fmt.Sprintf("%d", escrow.InspectionPeriod) +
			" day(s) after delivery to inspect and accept or raise a dispute.\n\n")
	}

	// 4. DISPUTE RESOLUTION
	b.WriteString("4. DISPUTE RESOLUTION\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString(disputeClause(escrow.DisputeResolution) + "\n\n")

	// 5. GENERAL CLAUSES
	b.WriteString("5. GENERAL CLAUSES\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString("Governing Law: " + governingLaw(escrow) + "\n")
	b.WriteString("Jurisdiction: " + jurisdiction(escrow) + "\n")
	b.WriteString("Entire Agreement: This Agreement constitutes the entire agreement between the Parties regarding its subject matter.\n")
	b.WriteString("Severability: If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n")
	b.WriteString("Amendments: No amendment to this Agreement shall be effective unless in writing and signed by all Parties.\n")
	b.WriteString("No Waiver: The failure of any Party to enforce any provision shall not constitute a waiver thereof.\n\n")

	// 6. SIGNATURES
	b.WriteString("6. SIGNATURES\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString("IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.\n\n")
	b.WriteString("Buyer: ____________________________  Date: ____________\n")
	b.WriteString("       " + buyer + "\n\n")
	b.WriteString("Seller: ____________________________  Date: ____________\n")
	b.WriteString("       " + seller + "\n\n")
	if escrow.MediatorID != nil {
		b.WriteString("Mediator: ____________________________  Date: ____________\n")
		b.WriteString("       " + mediator + "\n\n")
	}

	// 7. AUDIT / BLOCKCHAIN
	b.WriteString("7. BLOCKCHAIN AUDIT LOG\n")
	b.WriteString("----------------------------------------------------------------\n")
	b.WriteString("Contract Hash: " + escrow.ContractHash + "\n")
	if escrow.BlockchainTxHash != "" {
		b.WriteString("Blockchain Transaction: " + escrow.BlockchainTxHash + "\n")
	}
	b.WriteString("Generated by: SafeDeal Escrow Platform. All terms are protected by hybrid blockchain audit logs.\n")

	return b.String()
}

func agreementTypeLabel(escrow *models.Escrow) string {
	if escrow.EscrowType == "project" {
		return "Project / Milestone Payment"
	}
	return "Item / Sales & Purchase"
}

func contractVersion(escrow *models.Escrow) string {
	if escrow.ContractVersion == "" {
		return "1.0"
	}
	return escrow.ContractVersion
}

func governingLaw(escrow *models.Escrow) string {
	if escrow.GoverningLaw == "" {
		return "Commercial Code of Ethiopia"
	}
	return escrow.GoverningLaw
}

func jurisdiction(escrow *models.Escrow) string {
	if escrow.Jurisdiction == "" {
		return "Ethiopia"
	}
	return escrow.Jurisdiction
}

func disputeClause(method string) string {
	switch strings.ToLower(strings.TrimSpace(method)) {
	case "mediation":
		return "DISPUTE RESOLUTION: Before either Party initiates arbitration or court proceedings, the Parties shall attempt to resolve any dispute through good faith mediation in Addis Ababa, Ethiopia. Mediation shall be completed within thirty (30) days of written notice. If mediation fails to resolve the dispute within this period, either Party may then proceed to arbitration or court litigation."
	case "court", "litigation", "court_litigation":
		return "DISPUTE RESOLUTION: Any dispute arising from this Agreement shall be resolved exclusively in the courts of Addis Ababa, Ethiopia, following the Commercial Code of Ethiopia. The Parties consent to the jurisdiction of these courts."
	default: // arbitration (incl. "AI Arbitration via SafeDeal")
		return "DISPUTE RESOLUTION: Any dispute arising from this Agreement shall be resolved through binding arbitration conducted in accordance with the rules of the Ethiopian Arbitration Centre. The arbitration shall be conducted in Addis Ababa, Ethiopia, before a sole arbitrator. The Parties waive their right to court litigation regarding the disputed matters. The award of the arbitrator shall be final and binding on both Parties. Each Party shall bear its own arbitration costs, unless otherwise determined by the arbitrator."
	}
}

func completionTypeLabel(ct models.CompletionType) string {
	switch ct {
	case models.CompletionDelivery:
		return "Delivery"
	case models.CompletionServicePerformed:
		return "Service performed"
	case models.CompletionDocumentSubmitted:
		return "Document submitted"
	case models.CompletionInspectionPassed:
		return "Inspection passed"
	case models.CompletionCertificateIssued:
		return "Certificate issued"
	case models.CompletionOwnershipTransferred:
		return "Ownership transferred"
	case models.CompletionSystemDeployed:
		return "System deployed"
	}
	return string(ct)
}

func verificationLabel(v models.VerificationAuthority) string {
	switch v {
	case models.AuthBuyer:
		return "Buyer"
	case models.AuthSeller:
		return "Seller"
	case models.AuthMutual:
		return "Mutual agreement"
	case models.AuthPlatformMediator:
		return "Platform mediator"
	case models.AuthLicensedThirdParty:
		return "Licensed third party"
	case models.AuthGovernmentBody:
		return "Government body"
	case models.AuthSystemVerification:
		return "System verification"
	}
	return string(v)
}

func releaseTriggerLabel(rt models.ReleaseTrigger) string {
	switch rt {
	case models.TriggerBuyerApproval:
		return "Buyer approval"
	case models.TriggerSellerConfirmation:
		return "Seller confirmation"
	case models.TriggerInspectionPassed:
		return "Inspection passed"
	case models.TriggerCertificateIssued:
		return "Certificate issued"
	case models.TriggerDocumentVerified:
		return "Document verified"
	case models.TriggerAutoAccept:
		return "Auto-accept after inspection window"
	case models.TriggerTimeExpiry:
		return "Time expiry"
	case models.TriggerCourtOrder:
		return "Court order"
	case models.TriggerArbitrationAward:
		return "Arbitration award"
	}
	return string(rt)
}

func formatAmount(v uint) string {
	return fmt.Sprintf("%d", v)
}

func subAmount(a, b uint) uint {
	if b > a {
		return 0
	}
	return a - b
}
