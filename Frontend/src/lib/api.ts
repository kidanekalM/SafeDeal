import axios, { AxiosResponse } from 'axios';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
  SearchUser,
  Escrow,
  CreateEscrowRequest,
  EscrowPayment,
  BankDetails,
  TransactionHistory,
  Milestone,
  CreateMilestoneRequest,
} from '../types';


const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'any-value-like-69420'
   },
  withCredentials: true, // ✅ Enables sending HTTP-only cookies automatically
});

let refreshPromise: Promise<string> | null = null;
const MAX_AUTH_RETRIES = 1;

// Add access token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = String(originalRequest.url || '');
    const isRefreshRequest = requestUrl.includes('/refresh-token');

    // Never recursively refresh the refresh call itself.
    if (isRefreshRequest) {
      return Promise.reject(error);
    }

    // Handle 401 errors with automatic token refresh and single-flight control.
    if (error.response?.status === 401 && (originalRequest._retryCount || 0) < MAX_AUTH_RETRIES) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      try {
        console.log("🔄 401 detected - attempting automatic token refresh...");
        if (!refreshPromise) {
          refreshPromise = api.post('/api/refresh-token')
            .then((refreshResponse) => {
              const newToken = refreshResponse.data.access_token;
              localStorage.setItem('access_token', newToken);
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        
        console.log("✅ Automatic token refresh successful!");
        
        // Update authorization header for the failed request
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error("❌ Automatic token refresh failed:", refreshError.message);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_profile');
        
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ---------- API endpoints ----------
export const authApi = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/api/login', data),

  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/api/register', data),

  logout: (): Promise<AxiosResponse<void>> => api.post('/api/v1/logout'),

  // ✅ Refresh using cookie — no params needed
  refreshToken: (): Promise<AxiosResponse<{ access_token: string; expires_in: number }>> =>
    api.post('/api/refresh-token'),
};

export const userApi = {
  getProfile: (): Promise<AxiosResponse<User>> => api.get('/api/v1/profile'),
  getTrustInsights: (): Promise<AxiosResponse<{trust_score:number; factors:{completed:number; disputed:number; refunded:number}}>> =>
    api.get('/api/v1/profile/trust-insights'),
  updateProfile: (data: UpdateProfileRequest, userId: number): Promise<AxiosResponse<User>> =>
    api.patch('/api/v1/updateprofile', data, {
      headers: {
        'X-User-ID': userId.toString(),
      },
    }),
  
  searchUsers: (query: string): Promise<AxiosResponse<{ data: { users: SearchUser[]; pagination: any; invited?: boolean }; message: string }>> =>
    api.get(`/api/search?q=${encodeURIComponent(query)}`),

  getContacts: (): Promise<AxiosResponse<{ contacts: SearchUser[]; total: number }>> => 
    api.get('/api/v1/escrows/contacts'),
  getAllUsers: (): Promise<AxiosResponse<{ users: SearchUser[]; total: number }>> => 
    api.get('/api/v1/search'),
  updateBankDetails: (data: BankDetails): Promise<AxiosResponse<User>> =>
    api.put('/api/v1/profile/bank-details', data),
  createWallet: (): Promise<AxiosResponse<User>> => api.post('/api/v1/wallet'),
  resendActivation: (email: string): Promise<AxiosResponse<{ message: string }>> =>
    axios.post(`${API_BASE_URL}/resend`, { email }),
};

// Escrow API - Based on backend endpoints
export const escrowApi = {
    // POST Create-escrow
    create: (data: CreateEscrowRequest): Promise<AxiosResponse<Escrow>> =>
        api.post('/api/v1/escrows', data),

    // GET My Escrows - Get user's escrows
    // Backend returns: { escrows: Escrow[], summary: { total, active, completed } }
    // Fix route mismatch - backend: /api/escrows, frontend was /my  
    getMyEscrows: (): Promise<AxiosResponse<Escrow[]>> =>
        api.get('/api/v1/escrows'),

    // GET Fetch-escrow
    getById: (id: number): Promise<AxiosResponse<Escrow>> =>
        api.get(`/api/v1/escrows/${id}`),

    // POST Accept-escrow
    accept: (id: number): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/${id}/accept`),

    // POST Confirm-receipt
    confirmReceipt: (id: number): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/${id}/confirm-receipt`),

    // POST Dispute
    dispute: (id: number, reason: string): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/dispute/${id}`, { reason }),

    // POST Cancel
    cancel: (id: number): Promise<AxiosResponse<void>> =>
        api.post(`/api/v1/escrows/${id}/cancel`),

    // POST Upload-receipt
    uploadReceipt: (id: number, receiptUrl: string): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/${id}/receipt`, { receipt_url: receiptUrl }),

    // POST Verify-CBE
    verifyCBE: (id: number, transactionId: string, accountSuffix: string): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/${id}/verify-cbe`, { transaction_id: transactionId, account_suffix: accountSuffix }),

    update: (id: number, data: { amount?: number; conditions?: string }): Promise<AxiosResponse<Escrow>> => 
        api.put(`/api/v1/escrows/${id}`, data),
    
    lock: (id: number): Promise<AxiosResponse<Escrow>> => 
        api.post(`/api/v1/escrows/${id}/lock`),

    // GET Dispute (if available)
    getDispute: (id: number): Promise<AxiosResponse<any>> =>
        api.get(`/api/v1/escrows/dispute/${id}`),
    resolveDispute: (id: number, action: 'release' | 'refund', note: string): Promise<AxiosResponse<any>> =>
        api.post(`/api/v1/escrows/dispute/${id}/resolve`, { action, note }),
    getStatusHistory: (id: number): Promise<AxiosResponse<any[]>> =>
        api.get(`/api/v1/escrows/${id}/status-history`),

    downloadFinalAgreement: (id: number): Promise<AxiosResponse<any>> =>
        api.get(`/api/v1/escrows/${id}/final-agreement`, { responseType: 'blob' }),

    requestAIDecision: (id: number): Promise<AxiosResponse<any>> =>
        api.post(`/api/v1/escrows/dispute/${id}/ai-decision`),
    refund: (id: number): Promise<AxiosResponse<Escrow>> =>
        api.post(`/api/v1/escrows/${id}/refund`),

    // Helper function to get multiple escrows by IDs
    getMultipleByIds: async (ids: number[]): Promise<Escrow[]> => {
        const promises = ids.map(id => escrowApi.getById(id));
        const responses = await Promise.allSettled(promises);
        return responses
            .filter((result): result is PromiseFulfilledResult<AxiosResponse<Escrow>> =>
                result.status === 'fulfilled')
            .map(result => result.value.data);
    },
};

// NEW: Milestone API - matches backend milestone_handler.go
export const milestoneApi = {
  getByEscrow: (escrowId: number): Promise<AxiosResponse<Milestone[]>> =>
    api.get(`/api/v1/escrows/${escrowId}/milestones`),

  create: (data: CreateMilestoneRequest): Promise<AxiosResponse<Milestone>> =>
    api.post('/api/v1/milestones', data),

  getById: (id: number): Promise<AxiosResponse<Milestone>> =>
    api.get(`/api/v1/milestones/${id}`),

  update: (id: number, data: Partial<CreateMilestoneRequest>): Promise<AxiosResponse<Milestone>> =>
    api.put(`/api/milestones/${id}`, data),

  submit: (id: number): Promise<AxiosResponse<{message: string, milestone: Milestone}>> =>
    api.put(`/api/milestones/${id}/submit`),

  approve: (id: number): Promise<AxiosResponse<{message: string, milestone: Milestone}>> =>
    api.put(`/api/milestones/${id}/approve`),

  reject: (id: number): Promise<AxiosResponse<{message: string, milestone: Milestone}>> =>
    api.put(`/api/milestones/${id}/reject`),
};

// Payment API - Based on backend endpoints
export const paymentApi = {
    // POST Payment
    initiateEscrowPayment: async (escrowId: number, paymentMethod: 'Chapa' | 'Transfer' = 'Chapa'): Promise<AxiosResponse<EscrowPayment>> => {
        // Fetch escrow to get amount if needed
        const escrowResp = await api.get(`/api/v1/escrows/${escrowId}`);
        const amount = escrowResp?.data?.amount;
        const profileRaw = localStorage.getItem('user_profile');
        let email = '';
        let first_name = '';
        let last_name = '';
        let phone_number = '';
        try {
            if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                email = profile.email || '';
                first_name = profile.first_name || '';
                last_name = profile.last_name || '';
                phone_number = profile.phone_number || '';
            }
        } catch { }

        return api.post('/api/v1/payments/initiate', {
            escrow_id: escrowId,
            amount,
            payment_method: paymentMethod,
            currency: 'ETB',
            email,
            first_name,
            last_name,
            phone_number,
        });
    },

    // GET Transaction History
    getTransactionHistory: (): Promise<AxiosResponse<{ transactions: TransactionHistory[]; total: number; status: string }>> =>
        api.get('/api/v1/payments/transactions'),
};

// WebSocket API for real-time features
export const wsApi = {
    // Chat WebSocket connection
    connectChat: (escrowId: number): WebSocket => {
        const token = localStorage.getItem('access_token') || '';
        if (escrowId === undefined || escrowId === null) {
            // Return a dummy WS that will immediately close to avoid null checks downstream
            const dummy = new WebSocket('ws://localhost:0');
            try { dummy.close(); } catch { }
            return dummy;
        }

        const wsBase = API_BASE_URL.startsWith('https')
            ? API_BASE_URL.replace('https', 'wss')
            : API_BASE_URL.replace('http', 'ws');
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        const wsUrl = `${wsBase}/api/chat/ws/${escrowId}${qs}`;
        try {
            return new WebSocket(wsUrl);
        } catch (error) {
            // Return a dummy socket that immediately closes
            const dummy = new WebSocket('ws://localhost:0');
            try { dummy.close(); } catch { }
            return dummy;
        }
    },

    // Notification WebSocket connection
    connectNotifications: (): WebSocket => {
        const token = localStorage.getItem('access_token') || '';
        const wsBase = API_BASE_URL.startsWith('https')
            ? API_BASE_URL.replace('https', 'wss')
            : API_BASE_URL.replace('http', 'ws');
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        const wsUrl = `${wsBase}/api/notifications/ws${qs}`;
        try {
            return new WebSocket(wsUrl);
        } catch (error) {
            const dummy = new WebSocket('ws://localhost:0');
            try { dummy.close(); } catch { }
            return dummy;
        }
    },
};

export default api;
