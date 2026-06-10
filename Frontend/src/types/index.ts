export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    activated: boolean;
    profession: string;
    wallet_address?: string;
    encrypted_private_key?: string;
    account_name?: string;
    account_number?: string;
    bank_code?: number;
    trust_score?: number;
    created_at: string;
    updated_at: string;
}

export interface SearchUser {
    id: number;
    first_name: string;
    last_name: string;
    profession: string;
    activated: boolean;
    email?: string;
}

export interface AuthResponse {
    user: User;
    access_token: string;
    refresh_token?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    first_name: string;
    last_name: string;
    profession: string;
    email: string;
    password: string;
    phone_number: string;
    account_name: string;
    account_number: string;
    bank_code: number;
    bank_name: string;
}

export interface UpdateProfileRequest {
    first_name?: string;
    last_name?: string;
    profession?: string;
}

// 🧱 1. CORE SYSTEM ENUMS
export type EscrowStatus = 'pending' | 'funded' | 'active' | 'in_progress' | 'disputed' | 'resolved' | 'completed' | 'cancelled' | 'verifying' | 'refunded';
export type MilestoneStatus = 'pending' | 'funded' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'disputed';
export type DisputeStatus = 'none' | 'open' | 'mediation' | 'arbitration' | 'resolved' | 'closed';
export type ResolutionType = 'none' | 'release_funds' | 'refund_funds' | 'partial_release' | 'hold_funds' | 'cancel_contract';

// 🧾 2. ESCROW LOGIC ENUMS
export type CompletionType = 'delivery' | 'service_performed' | 'document_submitted' | 'inspection_passed' | 'certificate_issued' | 'ownership_transferred' | 'system_deployed';
export type ReleaseTrigger = 'buyer_approval' | 'seller_confirmation' | 'inspection_passed' | 'certificate_issued' | 'document_verified' | 'auto_accept' | 'time_expiry' | 'court_order' | 'arbitration_award';
export type VerificationAuthority = 'buyer' | 'seller' | 'mutual' | 'platform_mediator' | 'licensed_third_party' | 'government_body' | 'system_verification';
export type EvidenceType = 'photo' | 'video' | 'document' | 'invoice' | 'receipt' | 'inspection_report' | 'certificate' | 'gps_location' | 'log_file' | 'signature';

export interface Escrow {
    id: number;
    buyer_id: number;
    seller_id: number;
    mediator_id?: number;
    amount: number;
    platform_fee: number;
    status: EscrowStatus;
    conditions?: string;
    jurisdiction?: string;
    governing_law?: string;
    dispute_resolution?: string;
    dispute_reason?: string;
    dispute_status?: DisputeStatus;
    resolution_type?: ResolutionType;
    resolution_note?: string;
    receipt_url?: string;
    blockchain_tx_hash?: string;
    blockchain_escrow_id?: number;
    title?: string;
    sub_type?: string;
    inspection_period?: number;
    active: boolean;
    is_locked: boolean;
    is_detailed: boolean;
    
    // Hash fields
    escrow_hash?: string;
    contract_hash?: string;
    
    // Detailed Data
    extra_data?: string;
    
    created_at: string;
    updated_at: string;
    buyer?: User;
    seller?: User;
    mediator?: User;
    milestones?: Milestone[];

    // Compatibility
    CreatedAt?: string;
}

export interface Milestone {
    id: number;
    escrow_id: number;
    title: string;
    description?: string;
    amount: number;
    due_date?: string;
    status: MilestoneStatus;
    order_index: number;
    approver_id?: number;
    submitted_at?: string;
    approved_at?: string;
    deliverable_url?: string;
    
    // Structured Logic
    completion_type: CompletionType;
    verification_authority: VerificationAuthority;
    release_trigger: ReleaseTrigger;
    evidence_types: string; // Comma separated list of EvidenceType
    
    // Business Logic
    auto_accept_days?: number;
    inspection_period_days?: number;
    required_approvals?: number;
    
    acceptance_criteria?: string;
    rejection_conditions?: string;
    cure_terms?: string;
    revision_window?: number;
    
    extra_data?: string;
    created_at: string;
    updated_at: string;
    approver?: User;
}

export interface CreateEscrowRequest {
    creator_role: 'seller' | 'buyer' | 'mediator';
    buyer_id?: number;
    seller_id?: number;
    mediator_id?: number;
    buyer_email?: string;
    seller_email?: string;
    mediator_email?: string;
    amount: number;
    conditions: string;
    title: string;
    sub_type?: string;
    inspection_period?: number;
    jurisdiction?: string;
    governing_law?: string;
    dispute_resolution?: string;
    extra_data?: string;
    milestones?: Partial<Milestone>[];
}

export type TransactionStatus = 'Pending' | 'Verifying' | 'Completed' | 'Failed' | 'Refunded';

export interface TransactionHistory {
    id: number;
    escrow_id: number;
    buyer_id: number;
    transaction_ref: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    payment_url?: string;
    created_at: string;
    updated_at: string;
}

export interface EscrowPayment {
    id: number;
    escrow_id: number;
    amount: number;
    status: string;
    payment_url?: string;
    transaction_ref?: string;
}

export interface BankDetails {
    bank_name: string;
    account_name: string;
    account_number: string;
    bank_code?: number;
}

export interface Message {
    id: number;
    escrow_id: number;
    sender_id: number;
    content: string;
    created_at: string;
    sender?: User;
}

export interface Notification {
    id: number;
    user_id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    read: boolean; // Compatibility
    metadata?: any;
    created_at: string;
}

export interface CreateMilestoneRequest {
    escrow_id: number;
    title: string;
    amount: number;
    description?: string;
    due_date?: string;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}
