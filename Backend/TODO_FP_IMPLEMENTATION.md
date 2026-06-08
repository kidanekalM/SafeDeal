# Family Planning Module Implementation TODO

**Reference:** docs/MASTER_DOCUMENT_A_FAMILY_PLANNING.md
**Status:** 0/20 complete

## Breakdown from Approved Plan

### Phase 1: Backend Models [0/4]
- ✅ 1. Created Backend_monolithic/internal/models/patient.go [NEW] (Patient, Visit, VisitNode)
- ✅ 2. Created models/visit.go, visit_node.go in patient.go
- ✅ 3. Created models/visit_node.go in patient.go
- ✅ 4. Edited models/user.go - Added IsPatient flag + Patients relation

### Phase 1 COMPLETE ✅

### Phase 2: Backend Handlers [2/2 ✅]
 - ✅ 5. Created Backend_monolithic/internal/handlers/healthcare_handler.go [NEW] (RegisterPatient, CreateFPVisit, UpdateNode, GetFlow)
 - ✅ 6. Tested build/go run - Backend running on 8081

### Phase 2 COMPLETE ✅

### Phase 3: Backend Routes [0/1]
 - [ ] 7. Edit Backend_monolithic/internal/routes/routes.go - Add /api/healthcare/*

### Phase 3: Backend Routes [0/1]
- [ ] 7. Edit Backend_monolithic/internal/routes/routes.go - Add /api/healthcare/*

### Phase 4: Frontend [0/5]
- [ ] 8. Create Frontend/src/pages/FPDashboard.tsx [NEW]
- [ ] 9. Create Frontend/src/pages/FPRegistration.tsx [NEW]
- [ ] 10. Create Frontend/src/pages/FPFlow.tsx [NEW]
- [ ] 11. Create Frontend/src/components/FPForms/TriageForm.tsx etc. [NEW]
- [ ] 12. Update Frontend/src/App.tsx, pages/Dashboard.tsx - Add nav

### Phase 5: Testing [0/5]
- [ ] 13. Add e2e/fp_flows.spec.ts
- [ ] 14. Backend tests for FP endpoints
- [ ] 15. Seed script scripts/seed_fp_patients.go
- [ ] 16. Manual test FP routes/UI

### Phase 6: Completion [0/3]
- [ ] 17. Update docs/SafeDeal_SYSTEM_STATUS.md
- [ ] 18. Update this TODO.md (mark complete)
- [ ] 19. Full system test (go test && npx playwright test)
- [ ] 20. attempt_completion

**Next Step:** Phase 1.1 - Create patient.go
