import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * Initialize RainbowKit Provider (if needed)
 * @param address - Wallet address
 * @param chainId - Chain ID
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
      // Check if initialization is needed to avoid duplicate initialization
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
 * Check if Ethereum Provider is available
 * @returns boolean
 */
export function hasEthereumProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * Check account connection status
 * @returns Promise<string[]> - Array of connected accounts
 */
export async function getConnectedAccounts(): Promise<string[]> {
  if (!hasEthereumProvider()) {
    return [];
  }

  try {
    // Use eth_accounts to get connected accounts (no popup)
    const accounts = await window.ethereum!.request({ 
      method: 'eth_accounts' 
    });
    
    // If multiple accounts exist, try to determine current active account
    if (accounts && accounts.length > 1) {
      try {
        // Try to get currently selected account (different wallets may have different methods)
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
 * Sync browser wallet state to wagmi
 * After connecting directly via window.ethereum, state synchronization is needed
 */
export async function syncBrowserWalletState(): Promise<{success: boolean, address?: string, chainId?: number}> {
  try {
    if (!hasEthereumProvider()) {
      return { success: false };
    }

    // Get currently connected accounts
    const accounts = await window.ethereum!.request({ 
      method: 'eth_accounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      return { success: false };
    }

    // Get current chain ID
    const chainIdHex = await window.ethereum!.request({ 
      method: 'eth_chainId' 
    });
    
    const chainId = parseInt(chainIdHex, 16);
    const address = accounts[0];

    console.log('Browser wallet state synced:', { address, chainId });

    // Force wagmi to recheck connection state
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Method 1: Manually trigger accountsChanged event
        const event = new CustomEvent('accountsChanged', { detail: accounts });
        window.ethereum.emit('accountsChanged', accounts);
        
        // Method 2: Trigger chainChanged event
        window.ethereum.emit('chainChanged', chainIdHex);
        
        // Method 3: Trigger custom event for application layer to listen
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { address, chainId, accounts }
        }));
        
        console.log('✅ Triggered wagmi sync events');
      } catch (eventError) {
        console.warn('Could not trigger events:', eventError);
      }
      
      // Add delay to give wagmi time to update
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { success: true, address, chainId };
  } catch (error) {
    console.error('Failed to sync browser wallet state:', error);
    return { success: false };
  }
} 