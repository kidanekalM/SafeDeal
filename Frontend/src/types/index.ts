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
    buyer?: User;
    seller?: User;
    // Add milestones to escrow
    milestones?: Milestone[];
    // Court-compliant fields
    contract_id?: string; // UUID for legal identification
    contract_version?: string;
    contract_type?: string; // escrow, conditional payment, milestone escrow
    contract_status?: string; // draft, active, completed, disputed, terminated
    activated_at?: string;
    terminated_at?: string;
    governing_law?: string; // Jurisdiction's governing law
    jurisdiction?: string; // Legal jurisdiction
    contract_hash?: string; // Hash of the signed document
    document_storage_uri?: string; // URI where document is stored
    evidence_uri?: string; // URI for evidence storage
    dispute_resolution_status?: string;
    termination_reason?: string;
}

export interface CreateEscrowRequest {
    seller_id: number;
    amount: number;
    conditions?: string;
    // Add milestones to the request
    milestones?: CreateMilestoneRequest[];
    // Court-compliant fields
    contract_type?: string;
    governing_law?: string;
    jurisdiction?: string;
}

export type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

// Define Milestone type
export interface Milestone {
    id: number;
    escrow_id: number;
    title: string;
    description: string;
    amount: number;
    due_date?: string;
    status: 'Pending' | 'Funded' | 'Submitted' | 'Approved' | 'Rejected' | 'Released';
    order_index: number;
    approver_id?: number;
    submitted_at?: string;
    approved_at?: string;
    deliverable_url?: string;
    created_at: string;
    updated_at: string;
    approver?: User;
    // Court-compliant fields
    milestone_name?: string;
    completion_status?: string;
    completion_timestamp?: string;
    approved_by?: number; // ID of approving user
    evidence_uri?: string; // URI for milestone completion evidence
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