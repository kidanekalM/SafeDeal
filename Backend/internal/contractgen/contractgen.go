package contractgen

import (
	"fmt"
	"strings"
	"time"

	"backend_monolithic/internal/models"
)

// Generate renders a structured escrow into a professional, unambiguous
// contract document. It uses defined terms consistently, numbered clauses,
// concrete deadlines, modal-verb discipline, and places scope (deliverables,
// exclusions, acceptance) in a structured Schedule rather than prose.
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
	buyerEmail := partyEmail(escrow.Buyer)
	sellerEmail := partyEmail(escrow.Seller)

	effectiveDate := time.Now().Format("January 2, 2006")
	amount := formatAmount(escrow.Amount)
	fee := formatAmount(escrow.PlatformFee)
	net := formatAmount(subAmount(escrow.Amount, escrow.PlatformFee))

	scope := escrow.Scope

	var b strings.Builder
	b.WriteString(header(escrow, effectiveDate))

	writeSection := func(title string) {
		b.WriteString("\n")
		b.WriteString(strings.ToUpper(title) + "\n")
		b.WriteString("----------------------------------------------------------------\n")
	}

	// 1. PARTIES
	writeSection("1. Parties")
	b.WriteString("1.1 Buyer (Depositor): " + buyer + "\n")
	if buyerEmail != "" {
		b.WriteString("    Email: " + buyerEmail + "\n")
	}
	b.WriteString("1.2 Seller (Beneficiary): " + seller + "\n")
	if sellerEmail != "" {
		b.WriteString("    Email: " + sellerEmail + "\n")
	}
	if escrow.MediatorID != nil {
		b.WriteString("1.3 Mediator: " + partyName(escrow.Mediator) + "\n")
		if m := partyEmail(escrow.Mediator); m != "" {
			b.WriteString("    Email: " + m + "\n")
		}
	}
	b.WriteString("1.4 The Buyer and the Seller are each a \"Party\" and together the \"Parties\".\n")

	// 2. PURPOSE & DEFINITIONS
	writeSection("2. Purpose and Definitions")
	b.WriteString("2.1 The Parties enter this Agreement for the exchange of goods/services set out in Section 3 (\"Deliverables\") for the Total Price in Section 4.\n")
	b.WriteString("2.2 \"Deliverables\" means the countable items listed in Schedule A.\n")
	b.WriteString("2.3 \"Acceptance\" means the Buyer's confirmation that a Deliverable meets the standard in Schedule A.\n")
	b.WriteString("2.4 \"Exclusions\" means the items listed in Schedule B, which are expressly outside the scope.\n")
	b.WriteString("2.5 \"Platform\" means SafeDeal escrow infrastructure used to hold and release funds.\n")

	// 3. DELIVERABLES (scope)
	writeSection("3. Deliverables")
	if scope != nil && len(scope.Deliverables) > 0 {
		b.WriteString("3.1 The Deliverables and their acceptance standards are set out in Schedule A and form part of this Agreement.\n")
		b.WriteString("3.2 No work outside Schedule A shall be required of the Seller unless a written Change Order is agreed under Section 9.\n")
	} else {
		// fallback to free-text description
		b.WriteString("3.1 Description: " + strings.TrimSpace(escrow.Description) + "\n")
		b.WriteString("3.2 No work beyond the Description shall be required of the Seller unless a written Change Order is agreed under Section 9.\n")
	}

	// 4. PRICE & PAYMENT
	writeSection("4. Price and Payment")
	b.WriteString("4.1 Total Price: " + amount + " ETB, payable into escrow before work begins.\n")
	b.WriteString("4.2 Platform Fee: " + fee + " ETB. Net amount to Seller: " + net + " ETB.\n")
	b.WriteString("4.3 Funds shall be held in escrow and released to the Seller only upon the Buyer's explicit Acceptance (Section 6). Funds shall never be released automatically.\n")

	// 5. MILESTONES (project)
	if escrow.EscrowType == "project" {
		writeSection("5. Milestones")
		if len(escrow.Milestones) > 0 {
			b.WriteString("5.1 The Total Price is allocated across the following Milestones:\n")
			for i, m := range escrow.Milestones {
				b.WriteString(fmt.Sprintf("5.%d %s — %s ETB\n", i+2, m.Title, formatAmount(m.Amount)))
			}
			b.WriteString("5.2 Each Milestone shall be subject to the same Acceptance procedure in Section 6.\n")
		} else {
			b.WriteString("5.1 The Total Price shall be released upon Acceptance of the full scope of Deliverables.\n")
		}
	}

	// 6. ACCEPTANCE PROCEDURE
	writeSection("6. Acceptance Procedure")
	accDays := 5
	deemed := false
	if scope != nil {
		if scope.AcceptanceDays > 0 {
			accDays = scope.AcceptanceDays
		}
		deemed = scope.DeemedAccept
	}
	b.WriteString(fmt.Sprintf("6.1 Upon delivery of a Deliverable, the Buyer shall have %d day(s) to inspect and either Accept it or object in writing stating specific reasons.\n", accDays))
	if deemed {
		b.WriteString(fmt.Sprintf("6.2 If the Buyer does not object in writing within %d day(s), the Deliverable shall be deemed Accepted.\n", accDays))
		b.WriteString("6.3 A deemed Acceptance confirms the Deliverable meets its standard; it does not by itself release funds unless the Buyer also approves release.\n")
	} else {
		b.WriteString("6.2 If the Buyer does not respond within " + fmt.Sprintf("%d", accDays) + " day(s), the Parties shall jointly confirm Acceptance; funds shall not be released without the Buyer's explicit approval.\n")
	}
	if scope != nil && strings.TrimSpace(scope.RejectionPolicy) != "" {
		b.WriteString("6.3 On rejection, " + strings.TrimSpace(scope.RejectionPolicy) + "\n")
	}
	if scope != nil && scope.CurePeriodDays > 0 {
		b.WriteString("6.4 The Seller shall have " + fmt.Sprintf("%d", scope.CurePeriodDays) + " day(s) to cure the identified defect before any remedy in Section 8 applies.\n")
	}

	// 7. STANDARDS (weasel-term prevention)
	writeSection("7. Quality Standards")
	if scope != nil && len(scope.Deliverables) > 0 {
		b.WriteString("7.1 Each Deliverable shall meet the objective standard stated in Schedule A. Where a named standard or numeric threshold is specified, it shall control over any general description.\n")
	} else {
		b.WriteString("7.1 The Seller shall deliver the described scope in a workmanlike manner consistent with industry practice.\n")
	}
	if scope != nil && strings.TrimSpace(scope.AcceptanceDetail) != "" {
		b.WriteString("7.2 Acceptance detail: " + strings.TrimSpace(scope.AcceptanceDetail) + "\n")
	}

	// 8. BREACH & REMEDIES
	writeSection("8. Breach and Remedies")
	b.WriteString("8.1 A Party shall be in breach if it materially fails to perform its obligations under this Agreement.\n")
	if scope != nil && strings.TrimSpace(scope.BreachTerms) != "" {
		b.WriteString("8.2 " + strings.TrimSpace(scope.BreachTerms) + "\n")
	}
	b.WriteString("8.3 On material breach that is not cured within a reasonable cure period, the non-breaching Party may terminate under Section 10.\n")
	b.WriteString("8.4 Either Party may raise a dispute through the Platform; funds shall remain held pending resolution.\n")

	// 9. CHANGE CONTROL
	writeSection("9. Change Control")
	b.WriteString("9.1 Any request for work outside Schedule A shall require a written Change Order specifying the scope, price, and schedule, agreed by both Parties, before work proceeds.\n")
	b.WriteString("9.2 Without a signed Change Order, no additional obligation shall bind either Party.\n")

	// 10. TERMINATION
	writeSection("10. Termination")
	notice := 7
	if scope != nil && scope.TerminationNoticeDays > 0 {
		notice = scope.TerminationNoticeDays
	}
	b.WriteString(fmt.Sprintf("10.1 Either Party may terminate this Agreement by written notice at least %d day(s) before the intended termination date.\n", notice))
	b.WriteString("10.2 On termination, the Parties shall reconcile completed and Accepted Deliverables and the corresponding portion of the Total Price.\n")

	// 11. EXCLUSIONS
	writeSection("11. Exclusions (Out of Scope)")
	if scope != nil && len(scope.Exclusions) > 0 {
		b.WriteString("11.1 The items in Schedule B are expressly outside the scope and shall not be required of the Seller.\n")
		b.WriteString("11.2 The Buyer shall not claim a Deliverable is incomplete on the basis of an item in Schedule B.\n")
	} else {
		b.WriteString("11.1 No exclusions were specified. Any item not listed in Schedule A is outside the scope.\n")
	}

	// 12. DISPUTE RESOLUTION
	writeSection("12. Dispute Resolution")
	b.WriteString(disputeClause(escrow.DisputeResolution) + "\n")

	// 13. GENERAL CLAUSES
	writeSection("13. General Clauses")
	b.WriteString("13.1 Governing Law: " + governingLaw(escrow) + "\n")
	b.WriteString("13.2 Jurisdiction: " + jurisdiction(escrow) + "\n")
	b.WriteString("13.3 Entire Agreement: This Agreement, together with Schedules A and B, constitutes the entire agreement between the Parties.\n")
	b.WriteString("13.4 Severability: If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n")
	b.WriteString("13.5 Amendments: No amendment shall be effective unless in writing and signed by both Parties.\n")
	b.WriteString("13.6 No Waiver: The failure of a Party to enforce any provision shall not constitute a waiver.\n")
	b.WriteString("13.7 Notices: Written notice may be delivered through the Platform's messaging system or by email to each Party's registered email.\n")

	// 14. SIGNATURES
	writeSection("14. Signatures")
	b.WriteString("IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.\n\n")
	b.WriteString("Buyer: ____________________________   Date: ____________\n")
	b.WriteString("       " + buyer + "\n\n")
	b.WriteString("Seller: ____________________________  Date: ____________\n")
	b.WriteString("       " + seller + "\n\n")
	if escrow.MediatorID != nil {
		b.WriteString("Mediator: __________________________  Date: ____________\n")
		b.WriteString("       " + partyName(escrow.Mediator) + "\n\n")
	}

	// SCHEDULE A - Deliverables
	writeSection("Schedule A: Deliverables and Acceptance Standards")
	if scope != nil && len(scope.Deliverables) > 0 {
		for i, d := range scope.Deliverables {
			b.WriteString(fmt.Sprintf("A%d. %s\n", i+1, d.Title))
			b.WriteString("     Standard: " + deliverableStandardLabel(d.Standard, d.StandardRef) + "\n")
		}
	} else {
		b.WriteString("A1. " + strings.TrimSpace(escrow.Title) + "\n")
		b.WriteString("     Standard: " + strings.TrimSpace(escrow.Description) + "\n")
	}

	// SCHEDULE B - Exclusions
	writeSection("Schedule B: Exclusions (Out of Scope)")
	if scope != nil && len(scope.Exclusions) > 0 {
		for i, e := range scope.Exclusions {
			b.WriteString(fmt.Sprintf("B%d. %s\n", i+1, e.Title))
		}
	} else {
		b.WriteString("B1. None specified. Any item not listed in Schedule A is outside the scope.\n")
	}

	// BLOCKCHAIN AUDIT
	writeSection("Blockchain Audit Log")
	b.WriteString("Contract Hash: " + escrow.ContractHash + "\n")
	if escrow.BlockchainTxHash != "" {
		b.WriteString("Blockchain Transaction: " + escrow.BlockchainTxHash + "\n")
	}
	b.WriteString("Generated by: SafeDeal Escrow Platform. All terms are protected by hybrid blockchain audit logs.\n")

	return b.String()
}

func header(escrow *models.Escrow, effectiveDate string) string {
	return "================================================================\n" +
		"                  SAFEDEAL ESCROW AGREEMENT\n" +
		"================================================================\n\n" +
		"Agreement Type: " + agreementTypeLabel(escrow) + "\n" +
		"Agreement ID: " + fmt.Sprintf("%d", escrow.ID) + "\n" +
		"Version: " + contractVersion(escrow) + "\n" +
		"Effective Date: " + effectiveDate + "\n"
}

func agreementTypeLabel(escrow *models.Escrow) string {
	if escrow.EscrowType == "project" {
		return "Detailed / Milestone Payment"
	}
	return "Quick / Sales & Purchase"
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

func deliverableStandardLabel(std, ref string) string {
	switch strings.ToLower(strings.TrimSpace(std)) {
	case "page_count":
		return "Page count: " + ref
	case "named_standard":
		return "Named standard: " + ref
	case "numeric_threshold":
		return "Numeric threshold: " + ref
	case "reference_file":
		return "Reference: " + ref
	default:
		return "Not specified — to be confirmed by the Buyer at Acceptance"
	}
}

func disputeClause(method string) string {
	switch strings.ToLower(strings.TrimSpace(method)) {
	case "mediation":
		return "12.1 Before either Party initiates arbitration or court proceedings, the Parties shall attempt to resolve any dispute through good faith mediation in Addis Ababa, Ethiopia, within thirty (30) days of written notice.\n12.2 If mediation fails within that period, either Party may proceed to arbitration or court litigation."
	case "court", "litigation", "court_litigation":
		return "12.1 Any dispute arising from this Agreement shall be resolved exclusively in the courts of Addis Ababa, Ethiopia, following the Commercial Code of Ethiopia, to whose jurisdiction the Parties consent."
	default:
		return "12.1 Any dispute arising from this Agreement shall be resolved through binding arbitration in accordance with the rules of the Ethiopian Arbitration Centre.\n12.2 Arbitration shall be held in Addis Ababa, Ethiopia, before a sole arbitrator.\n12.3 The Parties waive their right to court litigation regarding the disputed matters.\n12.4 The arbitrator's award shall be final and binding on both Parties."
	}
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