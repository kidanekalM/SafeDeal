// SafeDeal Configuration & Tier System (Phase 0)
export const CONFIG = {
  // Tier thresholds in ETB (configurable based on bank / NBE guidelines)
  TIER_0_MAX_VIEW_AMOUNT: Infinity, // Anyone can view shared deal terms
  TIER_1_MAX_AMOUNT: 10000,          // Phone + OTP threshold for standard deals (in ETB)
  
  // Supported local payment integrations
  PAYMENT_METHODS: ['Telebirr', 'CBE Birr', 'Bank Transfer'],
  
  // Default platform settings
  DEFAULT_CURRENCY: 'ETB',
  DEFAULT_INSPECTION_DAYS: 3,
  DEFAULT_DISPUTE_RESOLUTION: 'platform_mediation', // Simple platform mediation by default
};
