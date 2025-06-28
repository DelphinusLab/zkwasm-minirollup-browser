// 环境变量适配器 - 统一使用 REACT_APP_ 前缀

export interface EnvConfig {
  chainId: number;
  depositContract: string;
  tokenContract: string;
  walletConnectId: string;
  mode: string;
}

// 统一的环境变量获取函数
export function getEnvConfig(): EnvConfig {
  const defaultConfig: EnvConfig = {
    chainId: 11155111, // 默认 Sepolia testnet
    depositContract: '',
    tokenContract: '',
    walletConnectId: '',
    mode: 'development'
  };

  try {
    // 1. 优先检查 Vite 环境 (import.meta.env)
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
    
    // 2. 检查 Node.js 环境 (process.env) - 适用于 Create React App, Next.js 等
    if (typeof process !== 'undefined' && process.env) {
      return {
        chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'),
        depositContract: process.env.REACT_APP_DEPOSIT_CONTRACT || '',
        tokenContract: process.env.REACT_APP_TOKEN_CONTRACT || '',
        walletConnectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
        mode: process.env.NODE_ENV || 'development'
      };
    }
    
    // 3. 检查全局变量 (适用于某些构建工具)
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
    
    // 4. 检查自定义全局变量
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

// 单独获取特定环境变量的函数
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

// 验证环境配置
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

// 设置自定义配置 (适用于运行时配置)
let customConfig: Partial<EnvConfig> | null = null;

export function setCustomConfig(config: Partial<EnvConfig>) {
  customConfig = config;
}

export function getCustomConfig(): Partial<EnvConfig> | null {
  return customConfig;
}

// 获取最终配置 (合并自定义配置和环境变量)
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