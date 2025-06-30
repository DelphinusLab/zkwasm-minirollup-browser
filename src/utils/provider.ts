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
      // 强制重新初始化以确保状态同步
      try {
        await currentProvider.initialize(address as `0x${string}`, chainId);
        
        // 尝试调用connect方法以确保完全初始化
        try {
          await currentProvider.connect();
        } catch (connectError) {
          console.warn('Provider connect call failed, but initialization may still be valid:', connectError);
          // 不抛出错误，因为initialize可能已经成功了
        }
      } catch (error) {
        console.error('Provider initialization failed:', error);
        throw error;
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
    // 使用 eth_accounts 获取已连接的账户（不会弹窗）
    const accounts = await window.ethereum!.request({ 
      method: 'eth_accounts' 
    });
    
    // 如果有多个账户，尝试确定当前活跃的账户
    if (accounts && accounts.length > 1) {
      try {
        // 尝试获取当前选中的账户（不同钱包可能有不同的方法）
        const selectedAddress = await window.ethereum!.request({ 
          method: 'eth_coinbase' 
        });
        if (selectedAddress && accounts.includes(selectedAddress)) {
          return [selectedAddress, ...accounts.filter((acc: string) => acc !== selectedAddress)];
        }
      } catch (error) {
        // eth_coinbase not supported, use first account
      }
    }
    
    return accounts || [];
  } catch (error) {
    console.warn('Failed to get connected accounts:', error);
    return [];
  }
}

/**
 * 强制获取当前活跃账户（会触发钱包授权弹窗）
 * @returns Promise<string[]> - 当前活跃的账户数组
 */
export async function requestActiveAccounts(): Promise<string[]> {
  if (!hasEthereumProvider()) {
    throw createError(ERROR_MESSAGES.NO_ETHEREUM, 'NO_ETHEREUM');
  }

  try {
    const accounts = await window.ethereum!.request({ 
      method: 'eth_requestAccounts' 
    });
    return accounts || [];
  } catch (error) {
    console.warn('Failed to request active accounts:', error);
    throw createError(
      `Failed to request accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'REQUEST_ACCOUNTS_ERROR',
      error
    );
  }
} 