// Environment variable adapter - unified use of REACT_APP_ prefix

// Configure dotenv to load .env files
import { config as dotenvConfig } from 'dotenv';

// Initialize dotenv to load environment variables from .env files
// This will load .env, .env.local, .env.development, etc.
try {
  dotenvConfig();
} catch (error) {
  // dotenv is optional, ignore errors if it fails
  console.debug('dotenv configuration skipped:', error instanceof Error ? error.message : error);
}

export interface EnvConfig {
  chainId: number;
  depositContract: string;
  tokenContract: string;
  walletConnectId: string;
  mode: string;
  rpcUrl: string; // Add RPC URL configuration
}

// Unified environment variable getter function
export function getEnvConfig(): EnvConfig {
  const defaultConfig: EnvConfig = {
    chainId: 11155111, // Default Sepolia testnet
    depositContract: '',
    tokenContract: '',
    walletConnectId: '',
    mode: 'development',
    rpcUrl: '' // Default empty string for rpcUrl
  };

  try {
    // Helper function to clean JSON.stringify'd values from Vite's define config
    const cleanValue = (value: string | undefined): string => {
      if (!value) return '';
      // Remove surrounding quotes if present (from JSON.stringify)
      return value.replace(/^"(.*)"$/, '$1');
    };

    // Start with default config
    let config = { ...defaultConfig };

    // 1. Check Node.js environment (process.env) - for Create React App, Next.js etc.
    if (typeof process !== 'undefined' && process.env) {
      console.log('Using process.env for environment variables');
      const chainIdStr = cleanValue(process.env.REACT_APP_CHAIN_ID);
      const processConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: cleanValue(process.env.REACT_APP_DEPOSIT_CONTRACT) || config.depositContract,
        tokenContract: cleanValue(process.env.REACT_APP_TOKEN_CONTRACT) || config.tokenContract,
        walletConnectId: cleanValue(process.env.REACT_APP_WALLETCONNECT_PROJECT_ID) || config.walletConnectId,
        mode: process.env.NODE_ENV || config.mode,
        rpcUrl: cleanValue(process.env.REACT_APP_URL) || config.rpcUrl
      };
      config = { ...config, ...processConfig };
      console.log('Config after process.env:', config);
    }
    
    // 2. Check Vite environment (import.meta.env) - merge with existing config
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      console.log('Using import.meta.env for environment variables');
      const env = (import.meta as any).env;
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID);
      const viteConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: cleanValue(env.REACT_APP_DEPOSIT_CONTRACT) || config.depositContract,
        tokenContract: cleanValue(env.REACT_APP_TOKEN_CONTRACT) || config.tokenContract,
        walletConnectId: cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID) || config.walletConnectId,
        mode: env.MODE || config.mode,
        rpcUrl: cleanValue(env.REACT_APP_URL) || config.rpcUrl
      };
      config = { ...config, ...viteConfig };
      console.log('Config after import.meta.env:', config);
    }
    
    // 3. Check global variables (for certain build tools)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      console.log('Using global __ENV__ for environment variables');
      const env = (window as any).__ENV__;
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID);
      const globalConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: cleanValue(env.REACT_APP_DEPOSIT_CONTRACT) || config.depositContract,
        tokenContract: cleanValue(env.REACT_APP_TOKEN_CONTRACT) || config.tokenContract,
        walletConnectId: cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID) || config.walletConnectId,
        mode: env.MODE || config.mode,
        rpcUrl: cleanValue(env.REACT_APP_URL) || config.rpcUrl
      };
      config = { ...config, ...globalConfig };
      console.log('Config after global __ENV__:', config);
    }
    
    // 4. Check custom global variables
    if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
      console.log('Using custom APP_CONFIG for environment variables');
      const appConfig = (window as any).APP_CONFIG;
      const customConfig = {
        chainId: appConfig.chainId ? parseInt(appConfig.chainId) : config.chainId,
        depositContract: appConfig.depositContract || config.depositContract,
        tokenContract: appConfig.tokenContract || config.tokenContract,
        walletConnectId: appConfig.walletConnectId || config.walletConnectId,
        mode: appConfig.mode || config.mode,
        rpcUrl: appConfig.rpcUrl || config.rpcUrl
      };
      config = { ...config, ...customConfig };
      console.log('Config after custom APP_CONFIG:', config);
    }
    
    console.log('Final config:', config);
    return config;
    
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

export function getRpcUrl(): string {
  return getEnvConfig().rpcUrl;
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