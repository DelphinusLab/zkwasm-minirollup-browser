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
    // 1. Priority check Node.js environment (process.env) - for Create React App, Next.js etc.
    // This now includes variables loaded by dotenv and Vite's define config
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WALLETCONNECT_PROJECT_ID) {
      // Helper function to clean JSON.stringify'd values from Vite's define config
      const cleanValue = (value: string | undefined): string => {
        if (!value) return '';
        // Remove surrounding quotes if present (from JSON.stringify)
        return value.replace(/^"(.*)"$/, '$1');
      };
      
      const chainIdStr = cleanValue(process.env.REACT_APP_CHAIN_ID) || '11155111';
      const config = {
        chainId: parseInt(chainIdStr),
        depositContract: cleanValue(process.env.REACT_APP_DEPOSIT_CONTRACT),
        tokenContract: cleanValue(process.env.REACT_APP_TOKEN_CONTRACT),
        walletConnectId: cleanValue(process.env.REACT_APP_WALLETCONNECT_PROJECT_ID),
        mode: process.env.NODE_ENV || 'development'
      };
      return config;
    }
    
    // 2. Check Vite environment (import.meta.env) - fallback for Vite-specific variables
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      // Helper function to clean JSON.stringify'd values
      const cleanValue = (value: string | undefined): string => {
        if (!value) return '';
        // Remove surrounding quotes if present (from JSON.stringify)
        return value.replace(/^"(.*)"$/, '$1');
      };
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID) || '11155111';
      const config = {
        chainId: parseInt(chainIdStr),
        depositContract: cleanValue(env.REACT_APP_DEPOSIT_CONTRACT),
        tokenContract: cleanValue(env.REACT_APP_TOKEN_CONTRACT),
        walletConnectId: cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID),
        mode: env.MODE || 'development'
      };
        return config;
    }
    
    // 3. Check global variables (for certain build tools)
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const env = (window as any).__ENV__;
      // Helper function to clean JSON.stringify'd values
      const cleanValue = (value: string | undefined): string => {
        if (!value) return '';
        // Remove surrounding quotes if present (from JSON.stringify)
        return value.replace(/^"(.*)"$/, '$1');
      };
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID) || '11155111';
      return {
        chainId: parseInt(chainIdStr),
        depositContract: cleanValue(env.REACT_APP_DEPOSIT_CONTRACT),
        tokenContract: cleanValue(env.REACT_APP_TOKEN_CONTRACT),
        walletConnectId: cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID),
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