// Network constants
export const CHAIN_IDS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  BSC_MAINNET: 56,
  BSC_TESTNET: 97,
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  CHAIN_ID: CHAIN_IDS.SEPOLIA,
  RPC_PORT: 3000,
  MODE: 'development',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NO_WALLET: 'Wallet not connected',
  NO_PROVIDER: 'No provider found!',
  NO_ETHEREUM: 'No ethereum provider found',
  NO_ACCOUNT: 'No account connected',
  NETWORK_MISMATCH: (expected: number, current: string) => 
    `Please manually switch to chain ${expected} in your wallet. Current chain: ${current}`,
  CONTRACT_NOT_CONFIGURED: 'Deposit contract or token contract address not configured',
  INSUFFICIENT_BALANCE: (required: string, available: string) => 
    `Not enough balance for deposit. Required: ${required}, Available: ${available}`,
  APPROVAL_FAILED: 'Not enough balance for approve',
} as const;

// Redux Action Types
export const ACTION_TYPES = {
  ACCOUNT: {
    FETCH: 'acccount/fetchAccount',
    DERIVE_L2: 'acccount/deriveL2Account',
    DEPOSIT: 'acccount/deposit',
    CONNECT_AND_LOGIN: 'account/connectAndLoginL1',
    CONNECT_WITH_HOOKS: 'account/connectAndLoginL1WithHooks',
  },
  CLIENT: {
    GET_CONFIG: 'client/getConfig',
    SEND_TRANSACTION: 'client/sendTransaction',
    SEND_EXTRINSIC: 'client/sendExtrinsicTransaction',
    QUERY_STATE: 'client/queryState',
    QUERY_INITIAL_STATE: 'client/queryInitialState',
  },
} as const;

// Application states
export const APP_STATUS = {
  INITIAL: 'Initial',
  LOADING_L1: 'LoadingL1',
  LOADING_L2: 'LoadingL2',
  L1_ERROR: 'L1AccountError',
  L2_ERROR: 'L2AccountError',
  DEPOSIT: 'Deposit',
  READY: 'Ready',
} as const;

// Connection status
export const CONNECT_STATE = {
  INIT: 'Init',
  ON_START: 'OnStart',
  PRELOADING: 'Preloading',
  IDLE: 'Idle',
  INSTALL_PLAYER: 'InstallPlayer',
  QUERY_CONFIG: 'QueryConfig',
  QUERY_STATE: 'QueryState',
  CONNECTION_ERROR: 'ConnectionError',
  WAITING_TX_REPLY: 'WaitingTxReply',
  WAITING_DEPOSIT_REPLY: 'WaitingDepositReply',
} as const;

// Numeric constants
export const NUMERIC_CONSTANTS = {
  DECIMALS: 18,
  WEI_MULTIPLIER: '10',
  DEFAULT_GAS_LIMIT: 21000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
} as const;

// Provider types
export const PROVIDER_TYPES = {
  BROWSER: 'browser',
  RAINBOW: 'rainbow',
  READONLY: 'readonly',
  WALLET: 'wallet',
} as const; 