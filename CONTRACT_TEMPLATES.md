# SafeDeal MVP Contract Templates Specification

This document defines the precise structure, clauses, and fields for the four generated agreements. For each agreement, it specifies which data maps to common schema fields (DB columns) and which data maps to type-specific fields (stored in `ExtraData` JSONB).

---

## Shared Dispute Resolution & Arbitration Clause

To satisfy the constraint of treating the **Arbitration Agreement** as a clause rather than a standalone contract type, the following section is dynamically appended to all four agreement templates:

### Dynamic Dispute Resolution Section (Clause Template)
Depending on the user's choice during contract creation, the **Disputes & Arbitration** section compiles one of three variants:

```
Pathway Selection (Form)
  ├──► AI Arbitration -> Renders AAA Arbitration Rules + Confidentiality + Waiver of Jury Trial
  ├──► Human Mediator  -> Renders Mediator Details + 14-day notice + Prevailing Party Fees
  └──► Mutual Consent  -> Renders 14-day negotiation period -> Fallback to Court litigation
```

1. **Pathway: AI Arbitration via SafeDeal (Default)**
   - *Clause Text*: "Any dispute arising out of or in connection with this Contract shall be submitted to binding AI Arbitration conducted on-platform via SafeDeal. The findings of the AI Arbitrator shall be final, binding, and enforceable. The proceedings shall remain strictly confidential. The parties expressly waive their right to a jury trial."
2. **Pathway: Designated Human Arbitrator / Mediator**
   - *Clause Text*: "Any dispute arising from this Contract shall be referred to the sole Arbitrator, `{{ArbitratorName}}` (Address: `{{ArbitratorAddress}}`, Phone: `{{ArbitratorPhone}}`). The arbitration shall be conducted in `{{ArbitratorCity}}`, `{{ArbitratorState}}`. The findings of the Arbitrator shall be binding and enforceable. The fees of the Arbitrator shall be shared equally between the parties, and each party shall bear their own attorney's fees."
3. **Pathway: Mediation then Court Fallback**
   - *Clause Text*: "Any dispute arising from this Contract shall first be referred to mutual mediation. If the dispute is not resolved within 14 days of written notice of a dispute, the dispute shall be resolved through court litigation in the courts of `{{Jurisdiction}}` under the governing laws of `{{GoverningLaw}}`. The prevailing party shall be entitled to recover reasonable attorney's fees."

---

## Template 1: Construction Contract

### Required Variables
- **Common Columns**: `BuyerID` (Client), `SellerID` (Contractor), `Title`, `Amount` (Contract Price), `DeliveryDate` (Completion Target).
- **Type-Specific JSONB (`ExtraData`)**:
  - `property_address` (string): The physical site location.
  - `project_scope_details` (string): Description of structural work.
  - `materials_included` (array of strings): Materials contractor supplies.
  - `materials_excluded` (array of strings): Materials client supplies.
  - `utility_responsibility_temporary` (string: `'contractor'` or `'owner'`).

### Optional Variables
- `liquidated_damages_per_day` (number): Daily penalty for delay.
- `warranty_period_months` (number): Duration of structural warranty (default: 12).
- `general_liability_limit` (number): Insurance liability limit.

### Document Sections & Mapping
1. **Title & Parties**: Injects GORM `Buyer` (Client) and `Seller` (Contractor) details.
2. **1. Description of Work**: Injects `project_scope_details` and `property_address` from `ExtraData`.
3. **2. Contract Price and Payments**: Injects GORM `Amount` and maps the `Milestones` array to an HTML schedule table.
4. **3. Materials and Labor**: Injects `materials_included` and `materials_excluded` lists.
5. **4. Licenses & Permits**: Standard clause assigning costs based on `permits_responsibility`.
6. **5. Utilities**: Injects `utility_responsibility_temporary` and `utility_responsibility_permanent`.
7. **6. Warranty**: Injects `warranty_period_months` from `ExtraData`.
8. **7. Inspection**: Injects GORM `InspectionPeriod` (default: 7 days) detailing buyer's rights to inspect milestones.
9. **8. Liquidated Damages**: If present, injects `liquidated_damages_per_day` fee.
10. **9. Disputes & Arbitration**: Renders the unified Dispute Resolution clause based on user preference.
11. **10. Signatures**: Outputs names, timestamps, and the SHA-256 fingerprint hash.

---

## Template 2: Freelance / Service Contract

### Required Variables
- **Common Columns**: `BuyerID` (Client), `SellerID` (Freelancer), `Title`, `Amount` (Total Budget), `DeliveryDate` (Final Deadline).
- **Type-Specific JSONB (`ExtraData`)**:
  - `service_deliverables_description` (string): List of services.
  - `payment_structure` (string: `'fixed'` or `'hourly'`).
  - `billing_interval` (string: `'weekly'`, `'monthly'`, `'at_completion'`).
  - `sub_freelancers_permitted` (boolean): Outsource permission.

### Optional Variables
- `late_fee_amount` (number): Late payment fee.
- `location_restrictions_allowed` (boolean): Force office work (default: false).
- `portfolio_disclosure_allowed` (boolean): Permission to show work in portfolio (default: true).

### Document Sections & Mapping
1. **Title & Parties**: Injects GORM `Buyer` and `Seller` names/emails.
2. **1. Recitals & Definitions**: Injects `service_deliverables_description`.
3. **2. Fees & Payment**: Injects GORM `Amount`, `payment_structure` and `billing_interval`. Renders milestones if `payment_structure` is milestone-based.
4. **3. Independent Contractor Status**: Standard "No Employment" clause.
5. **4. Work Environment**: Injects conditional terms for `location_restrictions_allowed`.
6. **5. Sub-Contracting**: Injects text based on `sub_freelancers_permitted` (if false: freelancer must perform all work personally).
7. **6. Intellectual Property**: Standard IP assignment to client, with conditional clause for `portfolio_disclosure_allowed`.
8. **7. Confidentiality**: Standard 3-year confidentiality restriction for Proprietary Information.
9. **8. Disputes & Arbitration**: Renders the unified Dispute Resolution clause.
10. **9. Signatures**: Electronic signing block.

---

## Template 3: Sales & Purchase Agreement (Goods)

### Required Variables
- **Common Columns**: `BuyerID` (Buyer), `SellerID` (Seller), `Amount` (Total Purchase Price), `DeliveryDate` (Delivery Deadline).
- **Type-Specific JSONB (`ExtraData`)**:
  - `itemized_goods` (array of objects): `[{"name": "...", "quantity": 1, "description": "..."}]`
  - `risk_of_loss_holder` (string: `'buyer'` or `'seller'`).
  - `risk_of_loss_transfer_point` (string: `'upon_shipment'` or `'upon_delivery'`).

### Optional Variables
- `shipping_address` (string): Target delivery address.
- `inspection_period_days` (number): Override GORM `InspectionPeriod`.

### Document Sections & Mapping
1. **Title & Parties**: Identifies Buyer and Seller.
2. **1. Description of Goods**: Generates an HTML table of `itemized_goods`.
3. **2. Purchase Price**: Injects GORM `Amount` (includes VAT/packing/shipment).
4. **3. Delivery Terms**: Injects GORM `DeliveryDate` and `shipping_address`.
5. **4. Risk of Loss**: Injects `risk_of_loss_holder` and `risk_of_loss_transfer_point`.
6. **5. Acceptance**: Injects GORM `InspectionPeriod` during which Buyer can file claims.
7. **6. Warranty of Title**: Standard warranty that Seller owns the goods free of liens.
8. **7. Disputes & Arbitration**: Injects chosen dispute resolution terms.
9. **8. Signatures**: Electronic signing block.

---

## Template 4: Vehicle Bill of Sale

### Required Variables
- **Common Columns**: `BuyerID` (Buyer), `SellerID` (Seller), `Amount` (Sale Consideration), `DeliveryDate` (Transfer Date).
- **Type-Specific JSONB (`ExtraData`)**:
  - `vehicle_make` (string): e.g., Toyota
  - `vehicle_model` (string): e.g., Corolla
  - `vehicle_vin` (string): 17-character VIN.
  - `vehicle_year` (number): Year of manufacture.
  - `vehicle_odometer_reading` (number): Mileage.

### Optional Variables
- `vehicle_type` (string): e.g., Sedan, SUV.
- `vehicle_features` (array of strings): Special add-ons.
- `is_sold_as_is` (boolean): Default is true.

### Document Sections & Mapping
1. **1. Consideration**: Injects GORM `Amount`, GORM `Buyer` name, and `DeliveryDate`.
2. **2. Payment Method**: Injects default text: "Certified Check or Cash" or details from payment configuration.
3. **3. Description of Motor Vehicle**: Generates list displaying `vehicle_make`, `vehicle_model`, `vehicle_vin`, `vehicle_year`, `vehicle_odometer_reading` and `vehicle_features`.
4. **4. Warranties of Title**: Renders owner covenant: "Seller warrants that Seller is the legal owner and the vehicle is free of all liens."
5. **5. "AS IS" Disclaimer**: If `is_sold_as_is` is true, renders: "Buyer acknowledges the motor vehicle is sold AS IS. Seller disclaims any implied warranties of merchantability or fitness for a particular purpose."
6. **6. Working Order Disclaimer**: Renders disclaimer concerning the mechanical order of the vehicle.
7. **7. Disputes & Arbitration**: Appends unified dispute terms.
8. **8. Signatures**: Electronic signing block.
