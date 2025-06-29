import { DelphinusRainbowConnector } from '../providers/provider';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * 初始化 RainbowKit Provider (如果需要)
 * @param address - 钱包地址
 * @param chainId - 链ID
 * @returns Promise<DelphinusRainbowConnector>
 */
export async function initializeRainbowProviderIfNeeded(
  address?: string, 
  chainId?: number
): Promise<void> {
  if (!address || !chainId) {
    throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
  }

  try {
    const { getProvider, DelphinusRainbowConnector } = await import('../providers/provider');
    const currentProvider = await getProvider();
    
    if (currentProvider instanceof DelphinusRainbowConnector) {
      try {
        // 检查是否已经初始化
        await currentProvider.connect();
      } catch (error) {
        // 如果连接失败，重新初始化
        await currentProvider.initialize(address as `0x${string}`, chainId);
      }
    }
  } catch (error) {
    throw createError(
      `Failed to initialize provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PROVIDER_INIT_FAILED',
      error
    );
  }
}

/**
 * 获取 MetaMask 账户信息
 * @returns Promise<{address: string, chainId: number}>
 */
export async function getMetaMaskAccountInfo(): Promise<{address: string, chainId: number}> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw createError(ERROR_MESSAGES.NO_ETHEREUM, 'NO_ETHEREUM');
  }

  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw createError(ERROR_MESSAGES.NO_ACCOUNT, 'NO_ACCOUNT');
    }

    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16)
    };
  } catch (error) {
    throw createError(
      `Failed to get MetaMask account info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'METAMASK_ERROR',
      error
    );
  }
}

/**
 * 检查是否有可用的 Ethereum Provider
 * @returns boolean
 */
export function hasEthereumProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * 检查账户连接状态
 * @returns Promise<string[]> - 连接的账户数组
 */
export async function getConnectedAccounts(): Promise<string[]> {
  if (!hasEthereumProvider()) {
    return [];
  }

  try {
    const accounts = await window.ethereum!.request({ 
      method: 'eth_accounts' 
    });
    return accounts || [];
  } catch (error) {
    console.warn('Failed to get connected accounts:', error);
    return [];
  }
} 