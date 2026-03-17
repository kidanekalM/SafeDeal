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
    refresh_token?: string; // Optional - should be HTTP-only cookie
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
}

export interface UpdateProfileRequest {
    first_name?: string;
    last_name?: string;
    profession?: string;
}

export type EscrowStatus = 'Pending' | 'Funded' | 'Released' | 'Disputed';

export interface Escrow {
    id: number;
    buyer_id: number;
    seller_id: number;
    amount: number;
    status: EscrowStatus;
    conditions?: string;
    blockchain_tx_hash?: string;
    blockchain_escrow_id?: number;
    active: boolean;
    created_at: string;
    updated_at: string;
    // Court-compliant fields
    governing_law?: string;
    jurisdiction?: string;
    contract_hash?: string;
    document_storage_uri?: string;
    deposit_timestamp?: string;
    deadline?: string;
    auto_release?: boolean;
    required_approvals?: number;
    evidence_uri?: string;
    terms_accepted_at?: string;
    signature_hash?: string;
    
    buyer?: User;
    seller?: User;
    milestones?: Milestone[];
}

export interface CreateEscrowRequest {
    seller_id: number;
    amount: number;
    conditions?: string;
    // Court-compliant fields
    governing_law?: string;
    jurisdiction?: string;
    contract_hash?: string;
    document_storage_uri?: string;
    deposit_timestamp?: string;
    deadline?: string;
    auto_release?: boolean;
    required_approvals?: number;
    evidence_uri?: string;
    milestones?: Array<{
        title: string;
        description: string;
        amount: number;
        due_date?: string;
        order_index?: number;
        approver_id?: number;
        deliverable_url?: string;
        // Court-compliant fields
        name?: string;
        completion_status?: string;
        completion_timestamp?: string;
        evidence_uri?: string;
        verification_method?: string;
        required_approvals?: number;
        approved_by?: number;
        auto_release?: boolean;
        deadline?: string;
        contract_hash?: string;
        document_storage_uri?: string;
        terms_accepted_at?: string;
        signature_hash?: string;
    }>;
}

export type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

// Milestone types
export type MilestoneStatus = 'Pending' | 'Funded' | 'Submitted' | 'Approved' | 'Rejected' | 'Released';

export interface Milestone {
    id: number;
    escrow_id: number;
    title: string;
    description: string;
    amount: number;
    due_date?: string;
    status: MilestoneStatus;
    order_index: number;
    approver_id?: number;
    submitted_at?: string;
    approved_at?: string;
    deliverable_url?: string;
    created_at: string;
    updated_at: string;
    approver?: User;
    
    // Court-compliant fields
    name?: string;
    completion_status?: string;
    completion_timestamp?: string;
    evidence_uri?: string;
    verification_method?: string;
    required_approvals?: number;
    approved_by?: number;
    auto_release?: boolean;
    deadline?: string;
    contract_hash?: string;
    document_storage_uri?: string;
    terms_accepted_at?: string;
    signature_hash?: string;
}

export interface CreateMilestoneRequest {
    escrow_id: number;
    title: string;
    description: string;
    amount: number;
    due_date?: string;
    order_index: number;
    approver_id?: number;
    deliverable_url?: string;
    // Court-compliant fields
    milestone_name?: string;
    evidence_uri?: string;
}

export interface UpdateMilestoneRequest {
    title?: string;
    description?: string;
    due_date?: string;
    order_index?: number;
    approver_id?: number;
    deliverable_url?: string;
    // Court-compliant fields
    completion_status?: string;
    evidence_uri?: string;
}

export interface EscrowPayment {
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

export interface BankDetails {
    account_name: string;
    account_number: string;
    bank_code: number;
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

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    metadata?: string;
    created_at: string;
}

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

// Dispute types
export interface Dispute {
    id: number;
    contract_id: string; // Court standard attribute
    escrow_id: number;
    raised_by: number; // User ID of who raised dispute
    dispute_reason: string;
    evidence_uri?: string; // Court standard attribute
    dispute_status: string;
    arbitrator_id?: number;
    resolution?: string;
    resolution_timestamp?: string;
    amount_in_dispute?: number;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
    escrow?: Escrow;
    user?: User;
}

// Evidence types
export interface DisputeEvidence {
    id: number;
    dispute_id: number;
    uploaded_by: number;
    file_hash: string; // For integrity verification
    file_uri: string; // Storage location
    file_type: string; // MIME type or extension
    upload_timestamp: string;
    description: string;
    created_at: string;
    updated_at: string;
    dispute?: Dispute;
    uploader?: User;
}

// Audit Trail types
export interface AuditTrail {
    id: number;
    contract_id: string; // Reference to contract
    entity_id: number; // ID of the entity being audited
    entity_type: string; // Type of entity (escrow, milestone, dispute, etc.)
    action_type: string; // What action was performed
    actor_id: number; // Who performed the action
    previous_state?: string; // State before action
    new_state?: string; // State after action
    timestamp: string;
    ip_address?: string; // IP address of the actor
    device_fingerprint?: string; // Device identifier
    session_id?: string; // Session identifier
    user_agent?: string; // Browser/device info
    previous_state_hash?: string; // Hash of previous state
    new_state_hash?: string; // Hash of new state
    signature?: string; // Digital signature if available
    created_at: string;
    updated_at: string;
}