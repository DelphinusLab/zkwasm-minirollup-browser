import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * 初始化 RainbowKit Provider (如果需要)
 * @param address - 钱包地址
 * @param chainId - 链ID
 * @returns Promise<void>
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
      // 检查是否需要初始化，避免重复初始化
      try {
        await currentProvider.initialize(address as `0x${string}`, chainId);
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
 * 同步浏览器钱包状态到 wagmi
 * 当直接使用 window.ethereum 连接后，需要同步状态
 */
export async function syncBrowserWalletState(): Promise<{success: boolean, address?: string, chainId?: number}> {
  try {
    if (!hasEthereumProvider()) {
      return { success: false };
    }

    // 获取当前连接的账户
    const accounts = await window.ethereum!.request({ 
      method: 'eth_accounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      return { success: false };
    }

    // 获取当前链ID
    const chainIdHex = await window.ethereum!.request({ 
      method: 'eth_chainId' 
    });
    
    const chainId = parseInt(chainIdHex, 16);
    const address = accounts[0];

    console.log('Browser wallet state synced:', { address, chainId });

    // 强制触发 wagmi 重新检查连接状态
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // 方法1: 手动触发 accountsChanged 事件
        const event = new CustomEvent('accountsChanged', { detail: accounts });
        window.ethereum.emit('accountsChanged', accounts);
        
        // 方法2: 触发 chainChanged 事件
        window.ethereum.emit('chainChanged', chainIdHex);
        
        // 方法3: 触发自定义事件让应用层监听
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { address, chainId, accounts }
        }));
        
        console.log('✅ Triggered wagmi sync events');
      } catch (eventError) {
        console.warn('Could not trigger events:', eventError);
      }
      
      // 延迟一点让 wagmi 有时间更新
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { success: true, address, chainId };
  } catch (error) {
    console.error('Failed to sync browser wallet state:', error);
    return { success: false };
  }
} 