# SafeDeal Rating, Editing, Tamper-Proof Implementation TODO

## 1. Backend Changes (High Priority)
- [ ] Create models/review.go (Review model with rating, comment, escrowID, reviewerID)
- [ ] Update models/user.go (+ Ratings []Review)
- [ ] Update models/milestone.go (+ ContentHash string, FileContent []byte or path)
- [ ] Create handlers/ratings_handler.go (POST /ratings, GET /ratings/:userId)
- [ ] Enhance user_handler.go: UpdateProfile with file upload (avatar/docs)
- [ ] Enhance milestone_handler.go: PUT /milestones/:id/deliverable (multipart upload + hash)
- [ ] Add tamper verification endpoint: GET /verify/:escrowId (hash+blockchain check)
- [ ] Update escrow_handler.go: Enhance LockEscrow with full hash chain
- [ ] Update GetTrustInsights: Implement weighted algo (completed*5 - disputed*10 + avg_rating*10)

## 2. DB Migration
- [ ] Add new tables/fields: reviews, milestone hashes; migrate DB

## 3. Frontend Changes
- [ ] Create components/RatingForm.tsx (stars + comment, post-escrow/profile)
- [ ] Create components/FileUpload.tsx (FormData upload + preview)
- [ ] Create components/TamperBadge.tsx (hash display + verify button)
- [ ] Update pages/Profile.tsx: Add file uploads, ratings section, tamper badges
- [ ] Update pages/EscrowDetails.tsx (or Dashboard): Rating form post-complete, tamper-proof views (simple: summary+badge; detailed: full hash/tx)
- [ ] Update components/RealTimeChat.tsx if needed for dispute ratings

## 4. Integration & Testing
- [ ] Upload storage: Local /uploads dir + nginx serve (or S3 later)
- [ ] Hashing: SHA256 on file content + escrow data
- [ ] Update e2e tests: simple_buyer.spec.ts etc. for ratings/upload/tamper
- [ ] Test rating algo edge cases (0-100 cap)
- [ ] Verify blockchain tamper logs

## 5. Completion
- [ ] attempt_completion with demo commands (npm run dev, open localhost)

Progress tracked here. Each step confirmed before next.

