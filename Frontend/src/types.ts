// Core types for SafeDeal Frontend

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  bank_details?: {
    account_number: string;
    bank_name: string;
    account_holder_name: string;
  };
  wallet_address?: string;
}

export interface Escrow {
  id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  status: 'Pending' | 'Funded' | 'Released' | 'Disputed' | 'Cancelled' | 'Refunded';
  conditions: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
  blockchain_tx_hash?: string;
}

export interface CreateEscrowRequest {
  creator_role?: 'seller' | 'buyer' | 'mediator';
  counterparty_email?: string;
  buyer_email?: string;
  seller_email?: string;
  amount: number;
  conditions: string;
}

export interface EscrowPayment {
  payment_url: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface TransactionHistory {
  id: number;
  escrow_id: number;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  escrow_id: number;
  title: string;
  description?: string;
  amount: number;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Funded';
  approver_id?: number;
  created_at: string;
}

export interface CreateMilestoneRequest {
  escrow_id: number;
  title: string;
  description?: string;
  amount: number;
}

export interface SearchUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export type AuthResponse = {
  access_token: string;
  expires_in: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type UpdateProfileRequest = Partial<User>;
