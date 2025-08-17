// zkWasm Staking Platform Configuration

// Staking Configuration
export const STAKING_CONFIG = {
  // Refresh intervals (in milliseconds)
  REFRESH_INTERVALS: {
    LEADERBOARD: 30000, // 30 seconds
    GLOBAL_STATS: 30000, // 30 seconds
    USER_DATA: 5000, // 5 seconds
    EFFECTIVE_POINTS: 1000, // 1 second (real-time)
  },
  
  // Query configuration
  QUERY_OPTIONS: {
    STALE_TIME: 30 * 1000, // 30 seconds
    CACHE_TIME: 5 * 60 * 1000, // 5 minutes
    RETRY: 2,
  },
  
  // Transaction limits
  LIMITS: {
    MAX_STAKE_AMOUNT: 1_000_000_000n, // 1 billion tokens
    MIN_STAKE_AMOUNT: 1n, // 1 token
    MIN_USDT_EXCHANGE: 1n, // Minimum 1 USDT exchange
    MIN_POINTS_WITHDRAWAL: 17280n, // Minimum 1 effective point withdrawal
  },
  
  // Exchange rates (from Rust backend)
  EXCHANGE_RATES: {
    POINTS_PER_USDT: 1_728_000_000n, // 10w * 17280 points = 1 USDT
    POINTS_DIVISOR: 17280n, // Points are divided by this when withdrawing
  },
};

// UI Configuration
export const UI_CONFIG = {
  // Pagination
  ITEMS_PER_PAGE: 20,
  
  // Animation durations
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  
  // Toast configuration
  TOAST_DURATION: 5000, // 5 seconds
};

// zkWasm Command Constants (must match Rust backend)
export const ZKWASM_COMMANDS = {
  INSTALL_PLAYER: 1,
  WITHDRAW: 2,
  DEPOSIT: 3,
  WITHDRAW_USDT: 4, // Exchange points for USDT
  WITHDRAW_POINTS: 5, // Exchange points for points
} as const;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  L2_NOT_CONNECTED: 'Please connect your L2 account first',
  PLAYER_NOT_INSTALLED: 'Please set up your staking account first',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INSUFFICIENT_POINTS: 'Insufficient points for exchange',
  INVALID_AMOUNT: 'Invalid amount',
  INVALID_USDT_AMOUNT: 'Invalid USDT amount',
  USDT_AMOUNT_TOO_SMALL: 'USDT amount too small (minimum 1 USDT)',
  INVALID_POINTS_AMOUNT: 'Invalid points amount',
  POINTS_AMOUNT_TOO_SMALL: 'Points amount too small (minimum 1 effective point)',
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  L2_CONNECTED: 'L2 account connected successfully',
  PLAYER_INSTALLED: 'Staking account set up successfully',
  STAKE_SUCCESS: 'Staking transaction successful',
  UNSTAKE_SUCCESS: 'Unstaking transaction successful',
  USDT_EXCHANGE_SUCCESS: 'USDT exchange successful',
  POINTS_WITHDRAWAL_SUCCESS: 'Points withdrawal successful',
  DATA_REFRESHED: 'Data refreshed successfully',
} as const;

// Validation
export const validateEnvironment = () => {
  const requiredVars = [
    'REACT_APP_CHAIN_ID',
    'REACT_APP_DEPOSIT_CONTRACT',
    'REACT_APP_TOKEN_CONTRACT',
    'REACT_APP_RPC_URL',
    'REACT_APP_URL',
  ];
  
  const missing = requiredVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value === 'your_api_key' || value === 'your_project_id';
  });
  
  if (missing.length > 0) {
    console.warn('Missing or placeholder environment variables:', missing);
    console.warn('Please update your .env file with actual values');
  }
  
  return missing.length === 0;
};

// Export environment validation
export const isEnvironmentValid = validateEnvironment(); 