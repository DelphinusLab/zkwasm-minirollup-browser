// Environment variable adapter - unified use of REACT_APP_ prefix

export interface EnvConfig {
  chainId: number;
  depositContract: string;
  tokenContract: string;
  walletConnectId: string;
  mode: string;
}

// Unified environment variable getter function
export function getEnvConfig(): EnvConfig {
  const defaultConfig: EnvConfig = {
    chainId: 11155111, // Default Sepolia testnet
    depositContract: '',
    tokenContract: '',
    walletConnectId: '',
    mode: 'development'
  };

  try {
    // 1. Priority check Vite environment (import.meta.env)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      return {
        chainId: parseInt(env.REACT_APP_CHAIN_ID || '11155111'),
        depositContract: env.REACT_APP_DEPOSIT_CONTRACT || '',
        tokenContract: env.REACT_APP_TOKEN_CONTRACT || '',
        walletConnectId: env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
        mode: env.MODE || 'development'
      };
    }
    
    // 2. Check Node.js environment (process.env) - for Create React App, Next.js etc.
    if (typeof process !== 'undefined' && process.env) {
      return {
        chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'),
        depositContract: process.env.REACT_APP_DEPOSIT_CONTRACT || '',
        tokenContract: process.env.REACT_APP_TOKEN_CONTRACT || '',
        walletConnectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
        mode: process.env.NODE_ENV || 'development'
      };
    }
    
    // 3. Check global variables (for certain build tools)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const env = (window as any).__ENV__;
      return {
        chainId: parseInt(env.REACT_APP_CHAIN_ID || '11155111'),
        depositContract: env.REACT_APP_DEPOSIT_CONTRACT || '',
        tokenContract: env.REACT_APP_TOKEN_CONTRACT || '',
        walletConnectId: env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
        mode: env.MODE || 'development'
      };
    }
    
    // 4. Check custom global variables
    if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
      const config = (window as any).APP_CONFIG;
      return {
        chainId: parseInt(config.chainId || '11155111'),
        depositContract: config.depositContract || '',
        tokenContract: config.tokenContract || '',
        walletConnectId: config.walletConnectId || '',
        mode: config.mode || 'development'
      };
    }
    
  } catch (error) {
    console.warn('Failed to get environment variables:', error);
  }
  
  return defaultConfig;
}

// Functions to get specific environment variables individually
export function getChainId(): number {
  return getEnvConfig().chainId;
}

export function getDepositContract(): string {
  return getEnvConfig().depositContract;
}

export function getTokenContract(): string {
  return getEnvConfig().tokenContract;
}

export function getWalletConnectId(): string {
  return getEnvConfig().walletConnectId;
}

export function getMode(): string {
  return getEnvConfig().mode;
}

// Validate environment configuration
export function validateEnvConfig(): { isValid: boolean; errors: string[] } {
  const config = getEnvConfig();
  const errors: string[] = [];
  
  if (!config.chainId || isNaN(config.chainId)) {
    errors.push('Invalid or missing REACT_APP_CHAIN_ID');
  }
  
  if (!config.depositContract) {
    errors.push('Missing REACT_APP_DEPOSIT_CONTRACT address');
  }
  
  if (!config.tokenContract) {
    errors.push('Missing REACT_APP_TOKEN_CONTRACT address');
  }
  
  if (!config.walletConnectId) {
    errors.push('Missing REACT_APP_WALLETCONNECT_PROJECT_ID');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Set custom configuration (for runtime configuration)
let customConfig: Partial<EnvConfig> | null = null;

export function setCustomConfig(config: Partial<EnvConfig>) {
  customConfig = config;
}

export function getCustomConfig(): Partial<EnvConfig> | null {
  return customConfig;
}

// Get final configuration (merge custom config and environment variables)
export function getFinalConfig(): EnvConfig {
  const envConfig = getEnvConfig();
  const custom = getCustomConfig();
  
  if (!custom) {
    return envConfig;
  }
  
  return {
    ...envConfig,
    ...custom
  };
} 