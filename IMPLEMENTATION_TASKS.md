# SafeDeal Contract System Implementation Tasks

This document contains sequential, concrete implementation tasks for implementing the SafeDeal MVP contract system. Each task specifies files to inspect, modify, create, and the exact acceptance criteria and test procedures.

---

## Phase 1: Database & Backend Enhancements

### TASK 001: Data Validation & Schema Syncing
- **Objective**: Ensure the GORM database has the necessary models and implement validation utilities for the `ExtraData` JSONB field.
- **Files to Inspect**:
  - [internal/models/escrow.go](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Backend/internal/models/escrow.go)
  - [configs/db.go](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Backend/configs/db.go)
- **Files to Create/Change**:
  - `[NEW] internal/models/validation.go`
- **Exact Implementation**:
  - Define Go structs mapping the type-specific schemas for `Construction`, `Freelance`, `SalesPurchase`, and `VehicleSale`.
  - Write a validator function `ValidateExtraData(escrowType string, extraDataJSON string) error` that unmarshals the JSON and returns errors if required fields are missing (e.g. missing `vehicle_vin` for a vehicle sale).
- **Dependencies**: None.
- **Acceptance Criteria**:
  - Calling `ValidateExtraData` with invalid fields fails.
  - Valid structured data returns `nil`.
- **Tests**: Create unit tests in `internal/models/validation_test.go` verifying positive and negative validation cases for all 4 contract types.

---

### TASK 002: Document Generator Module
- **Objective**: Implement a template-based document compiler in Go that generates static, legally formatted agreements.
- **Files to Inspect**:
  - [internal/models/escrow.go](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Backend/internal/models/escrow.go)
- **Files to Create/Change**:
  - `[NEW] internal/document/templates.go` (Stores the static HTML/text templates for the 4 contract types and the shared dispute clause).
  - `[NEW] internal/document/generator.go` (Implements `CompileContract(escrow *models.Escrow) (string, error)`).
- **Exact Implementation**:
  - In `templates.go`, define standard legal templates containing placeholders like `{{ClientName}}`, `{{OdometerReading}}`, and `{{DisputeClause}}`.
  - In `generator.go`, read variables from GORM columns and parse/extract fields from `ExtraData`. Replace placeholders to compile the final agreement.
  - Compute a SHA-256 fingerprint hash of the final text and assign it to the `ContractHash` field.
- **Dependencies**: TASK 001.
- **Acceptance Criteria**:
  - Compilation completes without panic.
  - Template placeholders are fully replaced without text formatting errors.
- **Tests**: Write unit tests in `internal/document/generator_test.go` verifying that generating a document returns a valid contract string with matching signatures and hash.

---

### TASK 003: API Handler Integration
- **Objective**: Update the API handlers to validate questionnaire data and trigger document generation upon escrow creation.
- **Files to Inspect**:
  - [internal/handlers/escrow_handler.go](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Backend/internal/handlers/escrow_handler.go)
- **Files to Create/Change**:
  - `[MODIFY] internal/handlers/escrow_handler.go`
- **Exact Implementation**:
  - Update `CreateEscrow` handler:
    - Call `ValidateExtraData` from TASK 001.
    - If valid, save the escrow and call `CompileContract` from TASK 002.
    - Save the generated contract text into the `GeneratedContract` column, and the computed hash into the `ContractHash` column.
  - Update `DownloadFinalizedAgreement` handler:
    - Instead of returning a stub, return the `GeneratedContract` text as plain text or HTML depending on request headers.
- **Dependencies**: TASK 002.
- **Acceptance Criteria**:
  - Creating an escrow with missing type-specific inputs returns HTTP 400.
  - Successful escrow creation automatically populates the `generated_contract` and `contract_hash` columns.
- **Tests**: Run manual integration tests using Postman or `curl` to POST a vehicle sale package and verify the returned JSON contains the generated contract text.

---

## Phase 2: Frontend Redevelopment

### TASK 004: Type Definitions & Client API Update
- **Objective**: Align frontend TypeScript definitions with the new backend schema.
- **Files to Inspect**:
  - [Frontend/src/types/index.ts](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/src/types/index.ts)
  - [Frontend/src/lib/api.ts](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/src/lib/api.ts)
- **Files to Create/Change**:
  - `[MODIFY] Frontend/src/types/index.ts`
  - `[MODIFY] Frontend/src/lib/api.ts`
- **Exact Implementation**:
  - Add type-specific interface definitions (`ConstructionDetails`, `FreelanceDetails`, `SalesPurchaseDetails`, `VehicleDetails`) inside `index.ts`.
  - Update `Escrow` type to include `extra_data` as a string/parsed object, and add the new contract types to the `escrow_type` enum (`'construction'`, `'freelance'`, `'sales_purchase'`, `'vehicle_sale'`).
- **Dependencies**: TASK 003.
- **Acceptance Criteria**:
  - Frontend compiles successfully without type checker errors.

---

### TASK 005: Form-First Creation Questionnaire (Wizard)
- **Objective**: Implement the unauthenticated step-by-step form wizard with a live contract preview.
- **Files to Inspect**:
  - [Frontend/src/pages/CreateEscrow.tsx](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/src/pages/CreateEscrow.tsx)
- **Files to Create/Change**:
  - `[MODIFY] Frontend/src/pages/CreateEscrow.tsx`
- **Exact Implementation**:
  - Redesign the wizard steps:
    - **Step 1: Choose Contract Type** (Grid of Construction, Freelance, Sales & Purchase, Vehicle Sale).
    - **Step 2: Core Parties** (Invite fields, search by email).
    - **Step 3: Questionnaire** (Renders conditional fields dynamically based on step 1 choice).
    - **Step 4: Milestones / Budget** (For Freelance/Construction: dynamic milestones table. For Sales/Vehicle: total price input).
    - **Step 5: Disputes & Law** (Select AI Arbitration, Designated mediator, or Mutual negotiation).
    - **Step 6: Review & Live Preview** (Shows compiled legal contract).
  - Check authentication state:
    - Allow unauthenticated users to fill steps 1-6.
    - If user is not authenticated when clicking "Launch Deal", save form state to local state, show the Authentication Modal, and redirect back to submit upon success.
- **Dependencies**: TASK 004.
- **Acceptance Criteria**:
  - Form validation works.
  - Live preview dynamically updates as questionnaire fields are filled.
  - Login prompt fires only at final execution step.
- **Tests**: Verify form behavior in web browser by launching a new deal.

---

### TASK 006: Review & Signature Screen
- **Objective**: Build the digital signature flows inside the deal details view.
- **Files to Inspect**:
  - [Frontend/src/pages/EscrowDetails.tsx](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/src/pages/EscrowDetails.tsx)
- **Files to Create/Change**:
  - `[MODIFY] Frontend/src/pages/EscrowDetails.tsx`
- **Exact Implementation**:
  - Renders a prominent signature card when contract is in `Draft` or `Ready for Review` state.
  - Clicking "Sign Agreement" calls `PUT /api/v1/escrows/:id/accept` (or similar signature endpoint) to toggle `BuyerAcceptedAt` or `SellerAcceptedAt` timestamps on the server.
  - Once both signatures are recorded, freeze the layout, hide edit buttons, show "Contract Executed" status, and prompt the buyer to "Fund Escrow".
- **Dependencies**: TASK 005.
- **Acceptance Criteria**:
  - Clicking sign records timestamps.
  - Edit controls are hidden once signatures are finalized.

---

### TASK 007: Print & Download Layouts
- **Objective**: Update the printable contract component to read the generated legal text directly.
- **Files to Inspect**:
  - [Frontend/src/components/PrintEscrowAgreement.tsx](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/src/components/PrintEscrowAgreement.tsx)
- **Files to Create/Change**:
  - `[MODIFY] Frontend/src/components/PrintEscrowAgreement.tsx`
- **Exact Implementation**:
  - Update the print container: instead of generating the sections in React, read the pre-rendered static `generated_contract` HTML/text from the API and render it inside a safe wrapper (`dangerouslySetInnerHTML`).
  - Render the digital signatures block at the bottom containing names, dates, and the `contract_hash` fingerprint.
- **Dependencies**: TASK 006.
- **Acceptance Criteria**:
  - Clicking "Print Contract" renders the finalized compiled agreement text.
  - Layout is clean and optimized for page breaks.
- **Tests**: Click "Print Contract" on the details page, verify print dialog opens and previews a formal legal contract page.

---

## Phase 3: E2E E2E Testing

### TASK 008: E2E E2E Flows Verification
- **Objective**: Create E2E test cases to verify the entire lifecycle of a structured contract.
- **Files to Inspect**:
  - [Frontend/e2e/full_escrow_flow.spec.ts](file:///c:/Users/hp/Desktop/Projects/sd/SafeDeal/Frontend/e2e/full_escrow_flow.spec.ts)
- **Files to Create/Change**:
  - `[NEW] Frontend/e2e/contract_lifecycle.spec.ts`
- **Exact Implementation**:
  - Implement a Playwright E2E script that:
    1. Opens home page unauthenticated -> clicks "Create Deal".
    2. Fills out a vehicle sale questionnaire -> clicks "Launch".
    3. Prompts login -> enters test credentials -> saves draft.
    4. Authenticates second party -> opens contract details -> both click "Sign".
    5. Verifies state transitions to `Executed`.
    6. Buyer deposits funds (mock verification) -> state becomes `Active`.
    7. Buyer accepts delivery -> state becomes `Completed`.
- **Dependencies**: TASK 007.
- **Acceptance Criteria**:
  - The E2E tests compile and run successfully via Playwright CLI.
- **Tests**: Run `npx playwright test Frontend/e2e/contract_lifecycle.spec.ts`.
