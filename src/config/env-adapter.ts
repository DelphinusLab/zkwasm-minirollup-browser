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
    // Helper function to clean and validate environment values
    const cleanValue = (value: string | undefined): string => {
      if (!value) return '';
      // Remove surrounding quotes if present (from JSON.stringify)
      const cleaned = value.replace(/^"(.*)"$/, '$1');
      
      // Security validation - prevent XSS and injection attacks
      if (cleaned.includes('<script') || 
          cleaned.includes('javascript:') || 
          cleaned.includes('data:') ||
          cleaned.includes('vbscript:') ||
          cleaned.includes('onload=') ||
          cleaned.includes('onerror=')) {
        console.error('🚨 Security: Malicious content detected in environment variable:', value);
        return '';
      }
      
      return cleaned;
    };

    // Validate contract address format
    const validateAddress = (address: string): string => {
      if (!address) return '';
      // Must be valid Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.warn('⚠️ Invalid address format:', address);
        return '';
      }
      return address;
    };

    // Validate URL format  
    const validateUrl = (url: string): string => {
      if (!url) return '';
      try {
        // Only allow http/https protocols
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          console.error('🚨 Security: Invalid URL protocol:', url);
          return '';
        }
        return url;
      } catch (error) {
        console.warn('⚠️ Invalid URL format:', url);
        return '';
      }
    };

    // Validate WalletConnect Project ID format
    const validateProjectId = (id: string): string => {
      if (!id) return '';
      // Should be alphanumeric with dashes/underscores only
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        console.warn('⚠️ Invalid WalletConnect Project ID format:', id);
        return '';
      }
      return id;
    };

    // Start with default config
    let config = { ...defaultConfig };

    // 1. Check Node.js environment (process.env) - for Create React App, Next.js etc.
    if (typeof process !== 'undefined' && process.env) {
      const chainIdStr = cleanValue(process.env.REACT_APP_CHAIN_ID);
      const processConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: validateAddress(cleanValue(process.env.REACT_APP_DEPOSIT_CONTRACT)) || config.depositContract,
        tokenContract: validateAddress(cleanValue(process.env.REACT_APP_TOKEN_CONTRACT)) || config.tokenContract,
        walletConnectId: validateProjectId(cleanValue(process.env.REACT_APP_WALLETCONNECT_PROJECT_ID)) || config.walletConnectId,
        mode: process.env.NODE_ENV || config.mode,
        rpcUrl: validateUrl(cleanValue(process.env.REACT_APP_URL)) || config.rpcUrl
      };
      config = { ...config, ...processConfig };
    }
    
    // 2. Check Vite environment (import.meta.env) - merge with existing config
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID);
      const viteConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: validateAddress(cleanValue(env.REACT_APP_DEPOSIT_CONTRACT)) || config.depositContract,
        tokenContract: validateAddress(cleanValue(env.REACT_APP_TOKEN_CONTRACT)) || config.tokenContract,
        walletConnectId: validateProjectId(cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID)) || config.walletConnectId,
        mode: env.MODE || config.mode,
        rpcUrl: validateUrl(cleanValue(env.REACT_APP_URL)) || config.rpcUrl
      };
      config = { ...config, ...viteConfig };
    }
    
    // 3. Check global variables (for certain build tools) - with security validation
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      const env = (window as any).__ENV__;
      
      console.warn('🔍 Loading config from window.__ENV__ - ensure this is from a trusted source');
      
      const chainIdStr = cleanValue(env.REACT_APP_CHAIN_ID);
      const globalConfig = {
        chainId: chainIdStr ? parseInt(chainIdStr) : config.chainId,
        depositContract: validateAddress(cleanValue(env.REACT_APP_DEPOSIT_CONTRACT)) || config.depositContract,
        tokenContract: validateAddress(cleanValue(env.REACT_APP_TOKEN_CONTRACT)) || config.tokenContract,
        walletConnectId: validateProjectId(cleanValue(env.REACT_APP_WALLETCONNECT_PROJECT_ID)) || config.walletConnectId,
        mode: env.MODE || config.mode,
        rpcUrl: validateUrl(cleanValue(env.REACT_APP_URL)) || config.rpcUrl
      };
      config = { ...config, ...globalConfig };
    }
    
    // 4. Check custom global variables - with security validation
    if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
      const appConfig = (window as any).APP_CONFIG;
      
      console.warn('🔍 Loading config from window.APP_CONFIG - ensure this is from a trusted source');
      
      const customConfig = {
        chainId: appConfig.chainId ? parseInt(String(appConfig.chainId)) : config.chainId,
        depositContract: validateAddress(String(appConfig.depositContract || '')) || config.depositContract,
        tokenContract: validateAddress(String(appConfig.tokenContract || '')) || config.tokenContract,
        walletConnectId: validateProjectId(String(appConfig.walletConnectId || '')) || config.walletConnectId,
        mode: String(appConfig.mode || config.mode),
        rpcUrl: validateUrl(String(appConfig.rpcUrl || '')) || config.rpcUrl
      };
      config = { ...config, ...customConfig };
    }
    
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