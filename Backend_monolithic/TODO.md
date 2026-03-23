# Fix Compilation Error: undefined: sc in routes.go

## Plan Steps:
1. ✅ PLAN APPROVED - Create TODO.md 
2. ✅ Edited Backend_monolithic/internal/routes/routes.go:
   - Created local handlers (including milestoneHandler using blockchainClient)
   - Assigned all to sc including sc.BlockChainClient = blockchainClient
3. ✅ Updated TODO.md with progress
4. ✅ Test: cd Backend_monolithic && go build ./cmd/main.go (Build passed after fixing additional undefined variables in internal/handlers/escrow_handler.go)
5. ✅ Complete task
