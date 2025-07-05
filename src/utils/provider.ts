import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * Initialize RainbowKit Provider (if needed) with enhanced session recovery
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
    
    // First, try to get the current provider
    let currentProvider;
    try {
      currentProvider = await getProvider();
    } catch (providerError) {
      // If getProvider fails, it might be because provider config is not set
      // Try to set a default rainbow config and retry
      console.log('Provider not found, attempting to set default rainbow config...');
      
      const { setProviderConfig } = await import('../providers/provider');
      setProviderConfig({ type: 'rainbow' });
      
      try {
        currentProvider = await getProvider();
      } catch (retryError) {
        throw createError(
          `Failed to initialize provider after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
          'PROVIDER_INIT_FAILED',
          retryError
        );
      }
    }
    
    if (currentProvider instanceof DelphinusRainbowConnector) {
      console.log('Initializing DelphinusRainbowConnector...', { address, chainId });
      
      try {
        await currentProvider.initialize(address as `0x${string}`, chainId);
        console.log('✅ Provider initialized successfully');
      } catch (initError) {
        console.error('Provider initialization failed:', initError);
        
        // If initialization fails, it might be due to session loss
        // Try to trigger a reconnection by calling connect()
        if (initError instanceof Error && 
            (initError.message.includes('No Ethereum provider') || 
             initError.message.includes('Provider initialization failed'))) {
          
          console.log('Attempting to reconnect due to session loss...');
          
          try {
            // Try to reconnect
            await currentProvider.connect();
            console.log('✅ Successfully reconnected and initialized');
          } catch (reconnectError) {
            // If reconnection also fails, provide a helpful error message
            throw createError(
              `Wallet connection lost. Please reconnect your wallet. Original error: ${initError.message}`,
              'WALLET_RECONNECT_REQUIRED',
              initError
            );
          }
        } else {
          throw initError;
        }
      }
    } else {
      console.log('Provider is not DelphinusRainbowConnector, skipping initialization');
    }
  } catch (error) {
    // Enhanced error handling with specific messages for different scenarios
    if (error instanceof Error) {
      if (error.message.includes('No Ethereum provider') || 
          error.message.includes('Provider not initialized')) {
        throw createError(
          'Wallet connection lost. Please reconnect your wallet to continue.',
          'WALLET_RECONNECT_REQUIRED',
          error
        );
      } else if (error.message.includes('Provider config not set')) {
        throw createError(
          'Wallet provider not configured. Please ensure your app is properly initialized.',
          'PROVIDER_CONFIG_MISSING',
          error
        );
      } else if (error.message.includes('No wagmi config')) {
        throw createError(
          'Wallet configuration missing. Please ensure DelphinusProvider wraps your app.',
          'WAGMI_CONFIG_MISSING',
          error
        );
      }
    }
    
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