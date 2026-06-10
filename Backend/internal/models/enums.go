package models

// 🧱 1. CORE SYSTEM ENUMS (GLOBAL)

type EscrowStatus string

const (
	EscrowPending    EscrowStatus = "pending"
	EscrowFunded     EscrowStatus = "funded"
	EscrowActive     EscrowStatus = "active"
	EscrowInProgress EscrowStatus = "in_progress"
	EscrowDisputed   EscrowStatus = "disputed"
	EscrowResolved   EscrowStatus = "resolved"
	EscrowCompleted  EscrowStatus = "completed"
	EscrowCancelled  EscrowStatus = "cancelled"
)

type MilestoneStatus string

const (
	MilestonePending     MilestoneStatus = "pending"
	MilestoneFunded      MilestoneStatus = "funded"
	MilestoneSubmitted   MilestoneStatus = "submitted"
	MilestoneUnderReview MilestoneStatus = "under_review"
	MilestoneApproved    MilestoneStatus = "approved"
	MilestoneRejected    MilestoneStatus = "rejected"
	MilestonePaid        MilestoneStatus = "paid"
	MilestoneDisputed    MilestoneStatus = "disputed"
)

type DisputeStatus string

const (
	DisputeNone       DisputeStatus = "none"
	DisputeOpen       DisputeStatus = "open"
	DisputeMediation  DisputeStatus = "mediation"
	DisputeArbitration DisputeStatus = "arbitration"
	DisputeResolved   DisputeStatus = "resolved"
	DisputeClosed     DisputeStatus = "closed"
)

type ResolutionType string

const (
	ResolutionNone           ResolutionType = "none"
	ResolutionReleaseFunds   ResolutionType = "release_funds"
	ResolutionRefundFunds    ResolutionType = "refund_funds"
	ResolutionPartialRelease ResolutionType = "partial_release"
	ResolutionHoldFunds      ResolutionType = "hold_funds"
	ResolutionCancelContract ResolutionType = "cancel_contract"
)

// 🧾 2. ESCROW LOGIC ENUMS (MOST IMPORTANT LEGALLY)

type CompletionType string

const (
	CompletionDelivery             CompletionType = "delivery"
	CompletionServicePerformed      CompletionType = "service_performed"
	CompletionDocumentSubmitted    CompletionType = "document_submitted"
	CompletionInspectionPassed      CompletionType = "inspection_passed"
	CompletionCertificateIssued    CompletionType = "certificate_issued"
	CompletionOwnershipTransferred  CompletionType = "ownership_transferred"
	CompletionSystemDeployed       CompletionType = "system_deployed"
)

type ReleaseTrigger string

const (
	TriggerBuyerApproval       ReleaseTrigger = "buyer_approval"
	TriggerSellerConfirmation  ReleaseTrigger = "seller_confirmation"
	TriggerInspectionPassed    ReleaseTrigger = "inspection_passed"
	TriggerCertificateIssued   ReleaseTrigger = "certificate_issued"
	TriggerDocumentVerified    ReleaseTrigger = "document_verified"
	TriggerAutoAccept          ReleaseTrigger = "auto_accept"
	TriggerTimeExpiry          ReleaseTrigger = "time_expiry"
	TriggerCourtOrder          ReleaseTrigger = "court_order"
	TriggerArbitrationAward    ReleaseTrigger = "arbitration_award"
)

type VerificationAuthority string

const (
	AuthBuyer              VerificationAuthority = "buyer"
	AuthSeller             VerificationAuthority = "seller"
	AuthMutual             VerificationAuthority = "mutual"
	AuthPlatformMediator    VerificationAuthority = "platform_mediator"
	AuthLicensedThirdParty VerificationAuthority = "licensed_third_party"
	AuthGovernmentBody      VerificationAuthority = "government_body"
	AuthSystemVerification  VerificationAuthority = "system_verification"
)

type EvidenceType string

const (
	EvidencePhoto            EvidenceType = "photo"
	EvidenceVideo            EvidenceType = "video"
	EvidenceDocument         EvidenceType = "document"
	EvidenceInvoice          EvidenceType = "invoice"
	EvidenceReceipt          EvidenceType = "receipt"
	EvidenceInspectionReport EvidenceType = "inspection_report"
	EvidenceCertificate      EvidenceType = "certificate"
	EvidenceGpsLocation      EvidenceType = "gps_location"
	EvidenceLogFile          EvidenceType = "log_file"
	EvidenceSignature        EvidenceType = "signature"
)
