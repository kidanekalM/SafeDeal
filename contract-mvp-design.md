# SafeDeal MVP Contract Flow Design

## Overview
Users complete structured forms → SafeDeal generates final legal documents. Users should never write or edit contract text manually.

## MVP Contract Types (Priority Order)

### 1. Standard Escrow Agreement
*Core contract governing the buyer-seller-mediator relationship for funds held in escrow.*

### 2. Sales & Purchase Agreement
*Documents the actual transaction goods/services being escrowed.*

### 3. Milestone Payment Terms
*Integrated with escrow milestones, governing when and how funds are released at each milestone.*

These 3 types share ~70% of their structure and differ mainly in the "transaction-specific" section.

---

## Shared Structure (All Contract Types)

| Field | Type | Description | Default/Source |
|-------|------|-------------|----------------|
| `contract_type` | string | "escrow" | User selects |
| `version` | string | "1.0" | Computed |
| `parties.buyer.name` | string | Buyer full name | Form input |
| `parties.buyer.email` | string | Buyer email | Form input |
| `parties.seller.name` | string | Seller full name | Form input |
| `parties.seller.email` | string | Seller email | Form input |
| `parties.mediator.name` | string | Mediator full name | Optional |
| `parties.mediator.email` | string | Mediator email | Optional |
| `recitals.effective_date` | date | Agreement effective date | Today's date |
| `recitals.background` | string | Context/background statement | Generated from escrow type |
| `terms.governing_law` | string | Jurisdiction governing law | "Commercial Code of Ethiopia" |
| `terms.jurisdiction` | string | Legal jurisdiction | "Ethiopia" |
| `terms.dispute_resolution` | string | Method: "arbitration"|"mediation"|"court" | "AI Arbitration via SafeDeal" |
| `general_clauses.entire_agreement` | bool | Entire agreement clause | true |
| `general_clauses.severability` | bool | Severability clause | true |
| `general_clauses.amendments` | string | Amendment process | "written signed by all parties" |
| `general_clauses.no_waiver` | bool | No waiver clause | true |
| `signatures.buyer_signed` | boolean | Buyer signature status | false |
| `signatures.seller_signed` | boolean | Seller signature status | false |
| `signatures.mediator_signed` | boolean | Mediator signature status | false (optional) |
| `metadata.generated_at` | timestamp | When contract was generated | Now |
| `metadata.hash` | string | SHA/Kecak hash of contract data | Computed |

---

## Type-Specific Sections

### A. Escrow-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `escrow.amount` | uint | Total escrow amount (ETB) |
| `escrow.platform_fee` | uint | Platform fee (ETB) |
| `escrow.delivery_date` | date | Expected delivery/completion date |
| `escrow.inspection_period` | int | Inspection period in days (default: 7) |
| `escrow.milestones` | array | Milestone details (see below) |
| `escrow.conditions` | text | Additional terms and conditions |

**Milestone Sub-Structure (per milestone):**
- `title` | string | Milestone title/description
- `amount` | uint | Amount released at this milestone
- `due_date` | date | When this milestone is due
- `completion_type` | enum | "delivery" | "service_performed" | "document_submitted" | "inspection_passed" | "certificate_issued" | "ownership_transferred" | "system_deployed"
- `verification_authority` | enum | "buyer" | "seller" | "mutual" | "platform_mediator" | "licensed_third_party" | "government_body" | "system_verification"
- `release_trigger` | enum | "buyer_approval" | "seller_confirmation" | "inspection_passed" | "certificate_issued" | "auto_accept" | "time_expiry" | "court_order" | "arbitration_award"
- `acceptance_criteria` | text | What constitutes acceptable completion
- `rejection_conditions` | text | Conditions for rejection/re-work

---

### B. Sales & Purchase Agreement–Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `sp.goods` | array | Items being sold |
| `sp.purchase_price.amount` | uint | Total price |
| `sp.purchase_price.currency` | string | "ETB" | "ETB" |
| `sp.delivery.method` | string | "door_door", "port_port", "pickup" |
| `sp.delivery.date` | date | Expected delivery date |
| `sp.risk_of_loss` | enum | "buyer" | "seller" | "transporter" |
| `sp.acceptance_period` | int | Business days for inspection after delivery |
| `sp.warranties` | array | {type, duration, coverage} |
| `sp.warranty_of_title` | bool | Seller warrants good title |
| `sp.force_majeure` | text | Custom force majeure events |

**Goods Sub-Structure (per item):**
- `description` | string | What is being sold
- `quantity` | number | How many
- `unit` | string | "piece", "kg", "hour", etc.

---

### C. Milestone Payment Terms–Specific Fields

*These are the same as the escrow.milestones structure above, emphasized as a separate contract type for users who want to define milestone terms independently.*

---

## Form Flow Design (User Experience)

### Guiding Principle: "Simple Forms, Complex Contract"

The form is **3 steps maximum**, with each step showing only relevant fields based on selections.

### Step 1: Parties & Basics (Always visible)

| Field | Required | Notes |
|-------|----------|-------|
| Buyer name | ✓ | |
| Buyer email | ✓ | |
| Seller name | ✓ | |
| Seller email | ✓ | |
| Mediator (optional) | | Leave blank for no mediator |
| Escrow type | ✓ | "Item" (simple transaction) or "Project" (milestone-based) |
| Title | ✓ | Short descriptive title |
| Description | | Optional longer description |
| Total amount | ✓ | In ETB |
| Platform fee | | Optional, defaults to 0 |

### Step 2: Terms & Details (Conditional based on escrow type)

**If "Item" selected:**
- Delivery date
- Inspection period (days)
- Dispute resolution method (radio: Arbitration / Mediation / Court)
- Any additional terms/conditions (textarea, optional)

**If "Project" selected:**
- All "Item" fields PLUS:
- Milestone grid (add multiple milestones):
  - Milestone title
  - Milestone amount (ETB)
  - Due date
  - Completion type (dropdown: delivery, service_performed, etc.)
  - Verification authority (dropdown: buyer, seller, mutual, platform_mediator)
  - Release trigger (dropdown: buyer_approval, seller_confirmation, inspection_passed, etc.)

**Shared for both:**
- Governing law (dropdown, default: "Commercial Code of Ethiopia")
- Jurisdiction (default: "Ethiopia")
- Dispute resolution method (already selected above)

### Step 3: Review & Generate

| Section | Content |
|---------|---------|
| Summary | Shows all entered data in readable form |
| Contract preview | Rendered contract text (read-only) |
| Actions | "Generate Contract" button |

When user clicks "Generate Contract":
1. Structured data is converted to contract document text
2. PDF/printable version is generated (using existing PrintEscrowAgreement logic enhanced)
3. User can download/sign
4. Signatures are collected via e-signature integration
5. Contract hash is computed and stored
6. Blockchain transaction is created (existing flow)

---

## Contract Generation Logic (Form → Document)

### How the Structured Data Becomes a Legal Document

**1. Data Collection:** User fills form → JSON data structure populated

**2. Template Rendering:** JSON is rendered into a contract template string (similar to how PrintEscrowAgreement.tsx works, but more comprehensive)

**3. Key Rendering Zones:**

```
SAFEDEAL ESCROW AGREEMENT

1. PARTIES TO THE AGREEMENT
   Buyer: [buyer_name]
   Seller: [seller_name]
   [Mediator: [mediator_name] if present]

2. RECITALS
   This Escrow Agreement is entered into effective [effective_date]
   between the Buyer and the Seller for the amount of [amount] ETB.

3. TERMS AND CONDITIONS
   Governing Law: [governing_law]
   Jurisdiction: [jurisdiction]
   Dispute Resolution: [dispute_resolution]
   
   [ escrow-specific terms: delivery_date, inspection_period, milestones table ]
   
   [ sales_purchase-specific terms: goods description, purchase_price, delivery terms ]

4. GENERAL CLAUSES
   This Agreement constitutes the entire agreement between the Parties...
   Any amendment must be in writing signed by all Parties...
   Severability: If any provision...
   No waiver of any provision...

5. SIGNATURES
   Buyer: ________________________ Date: __________
   Seller: ________________________ Date: __________
   [Mediator: ________________________ Date: __________ if present]

6. blockchain audit log
   Contract Hash: [hash]
   Generated by: SafeDeal Platform
```

**4. Hash Computation:** Same `computeEscrowHash` function used, but with all structured data included for integrity.

**5. Blockchain:** Existing `blockchainClient.CreateEscrow()` flow continues, now with richer contract data.

---

## Signature & Version Handling

### Signature Collection

1. **Electronic signatures** via integrated e-signature service (Contractbook/Scrive API or similar)
2. **Signature flow:**
   - User clicks "Sign Contract" in UI
   - E-signature service sends request to both parties
   - Each party signs electronically
   - Upon both signatures, `buyer_accepted_at` and `seller_accepted_at` are set
   - Contract status updates to "active"

### Version Handling

1. **Initial version:** "1.0" generated when contract is first created
2. **Amendments:** If parties need to modify, new version "1.1", "1.2" etc. is generated
3. **Version tracking:** `contract_version` field in Escrow model
4. **Version comparison:** PrintEscrowAgreement can show version history
5. **Backward compatibility:** Old versions retained for reference

### Current SafeDeal Integration

The existing `Escrow` model already has:
- `ContractVersion` field ✓
- `GeneratedContract` (text field for full contract) ✓
- `BuyerAcceptedAt` / `SellerAcceptedAt` ✓
- This design enhances the generation logic, not the storage model

---

## Arbitration & Dispute Resolution Integration

### How Arbitration is Represented in the Contract Structure

**1. Form Field (Step 2):**
```
Dispute resolution method (radio buttons):
[ ] Arbitration (binding, faster, less costly)
[ ] Mediation (non-binding, good faith effort first)
[ ] Court Litigation
```

**2. Contract Text Generated:**
Based on selection, the following clause is inserted:

**If Arbitration:**
```
DISPUTE RESOLUTION:
Any dispute arising from this Agreement shall be resolved through binding arbitration conducted in accordance with the rules of the Ethiopian Arbitration Centre (or agreed arbitral institution). The arbitration shall be conducted in [city], Ethiopia, before a sole arbitrator [or three arbitrators]. The Parties waive their right to court litigation regarding the disputed matters. The award of the arbitrator shall be final and binding on both Parties. Each Party shall bear their own arbitration costs, unless otherwise determined by the arbitrator.
```

**If Mediation:**
```
DISPUTE RESOLUTION:
Before either Party initiates arbitration or court proceedings, the Parties shall attempt to resolve any dispute through good faith mediation mediated by [name/organization] in Addis Ababa, Ethiopia. Mediation shall be completed within [30] days of written notice. If mediation fails to resolve the dispute within this period, either Party may then proceed to arbitration or court litigation.
```

**If Court Litigation:**
```
DISPUTE RESOLUTION:
Any dispute arising from this Agreement shall be resolved exclusively in the courts of Addis Ababa, Ethiopia, following the Commercial Code of Ethiopia. The Parties consent to the jurisdiction of these courts.
```

**3. Integration with Escrow Status:**
- When a dispute is created, `escrow.dispute_status` changes from "none" to "open"
- `escrow.resolution_type` can be: "none", "release_funds", "refund_funds", "partial_release", "cancel_contract", "arbitration_award"
- The dispute resolution method selected in the contract governs how the dispute flows
- Arbitration award can be recorded as `resolution_note` and trigger fund release/refund

### Keeping it Simple for Users

- **One decision point:** User picks arbitration/mediations/court in Step 2 of the form
- **No complex clauses:** The contract text auto-generates the appropriate clause based on this single choice
- **Default is "AI Arbitration via SafeDeal":** The existing default is preserved, but users can override
- **No manual clause editing:** Users never see or edit legal text directly

---

## MVP vs Future Scope

### MVP (Initial Release - What's Included)

| Feature | Status |
|---------|--------|
| Step 1: Parties & Basics form | ✅ Included |
| Step 2: Terms (delivery, inspection, dispute method) | ✅ Included |
| Step 3: Review & generate | ✅ Included |
| Escrow contract generation with general clauses | ✅ Included |
| Sales & Purchase goods description (basic) | ✅ Included |
| Milestone milestone grid (for project type) | ✅ Included |
| Arbitration/Mediation/Court dispute resolution | ✅ Included |
| Contract hash computation | ✅ Included |
| Printable PDF generation | ✅ Included (enhanced) |
| Signature collection placeholder | ✅ Included |
| Integration with existing escrow/milestone/dispute status | ✅ Included |

### Future Scope (Post-MVP)

| Feature | Notes |
|---------|-------|
| Sales & Purchase Agreement with full goods array | More detailed item catalog |
| Multiple contract types simultaneously | E.g., both escrow + SPA |
| Custom clause library | User-selectable additional clauses |
| AI-assisted form filling | Pre-populate from user profiles |
| Multi-language support (Amharic, English) | i18n for forms |
| E-signature integration (full) | Contractbook/Scrive API |
| Contract analytics & insights | Data extraction from signed contracts |
| Template library expansion | More specialized contract types |
| Integration with external CRM/ERP | Sync contract data |

---

## Data Model Schema (JSON Example)

```json
{
  "contract_type": "escrow",
  "version": "1.0",
  "parties": {
    "buyer": { "name": "Abebech Tadesse", "email": "abebech@example.com" },
    "seller": { "name": "Mekonnen Assefa", "email": "mekonnen@example.com" },
    "mediator": { "name": "Kidane Solomon", "email": "kidane@example.com" }
  },
  "recitals": {
    "effective_date": "2024-01-15",
    "background": "Escrow agreement for release of funds upon milestone completion"
  },
  "terms": {
    "governing_law": "Commercial Code of Ethiopia",
    "jurisdiction": "Ethiopia",
    "dispute_resolution": "arbitration"
  },
  "specific": {
    "escrow": {
      "amount": 50000,
      "platform_fee": 5000,
      "delivery_date": "2024-03-15",
      "inspection_period": 7,
      "milestones": [
        {
          "title": "Delivery of goods",
          "amount": 25000,
          "due_date": "2024-02-15",
          "completion_type": "delivery",
          "verification_authority": "buyer",
          "release_trigger": "buyer_approval"
        }
      ],
      "conditions": "Standard inspection and acceptance terms apply"
    }
  },
  "general_clauses": {
    "entire_agreement": true,
    "severability": true,
    "amendments": "written_signed",
    "no_waiver": true
  },
  "signatures": {
    "buyer_signed": false,
    "seller_signed": false,
    "mediator_signed": false
  },
  "metadata": {
    "generated_at": "2024-01-15T10:30:00Z",
    "hash": "0xabc123... (keccak256)"
  }
}
```