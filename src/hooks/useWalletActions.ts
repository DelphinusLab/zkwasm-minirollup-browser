import { useCallback } from 'react';
import { withProvider } from '../providers/provider';
import { 
  initializeRainbowProviderIfNeeded,
  validateAndSwitchNetwork,
  validateCurrentNetwork,
  executeDeposit,
  ERROR_MESSAGES,
  createError
} from '../utils';
import { L2AccountInfo } from '../models/L2AccountInfo';
import { loginL1AccountAsync, loginL2AccountAsync, depositAsync } from '../store/thunks';
import { resetAccountState, setL1Account } from '../store/account-slice';
import { clearProviderInstance, resetProviderForReconnection } from '../providers/provider';
import type { L1AccountInfo, AppDispatch, SerializableTransactionReceipt } from '../types';

// Helper function to handle WalletConnect session cleanup and state reset
async function handleWalletConnectSessionCleanup(dispatch: AppDispatch) {
  try {
    // Import clear functions dynamically
    const { clearWalletConnectStorageOnly, validateAndCleanWalletConnectStorage } = await import('../delphinus-provider');
    
    // First try to validate and clean sessions (this will only remove truly invalid ones)
    console.log('🔍 Validating and cleaning WalletConnect sessions...');
    const hasValidSession = await validateAndCleanWalletConnectStorage();
    
    if (!hasValidSession) {
      console.log('🧹 No valid sessions found, clearing WalletConnect storage...');
      clearWalletConnectStorageOnly();
    } else {
      console.log('⚠️ Some valid sessions exist, but current session appears stale');
      clearWalletConnectStorageOnly();
    }
    
    // Reset provider for reconnection but keep monitoring running  
    resetProviderForReconnection();
    
    // CRITICAL: Force disconnect wagmi to clear L1 state
    console.log('🔌 Forcing wagmi disconnect to clear L1 state...');
    try {
      const { disconnect } = await import('wagmi/actions');
      const { getSharedWagmiConfig } = await import('../providers/provider');
      
      const config = getSharedWagmiConfig();
      if (config) {
        await disconnect(config);
        console.log('✅ Wagmi disconnected successfully');
      }
    } catch (disconnectError) {
      console.warn('Failed to disconnect wagmi:', disconnectError);
    }
    
    // Clear Redux L1 state
    console.log('🧹 Clearing Redux L1 state...');
    dispatch(resetAccountState());
    
    console.log('✅ Invalid sessions and L1 state cleared');
    
  } catch (clearError) {
    console.warn('Failed to clear invalid session:', clearError);
  }
}

interface WalletActionsHookReturn {
  connectAndLoginL1: (dispatch: AppDispatch) => Promise<L1AccountInfo>;
  loginL2: (dispatch: AppDispatch, messageToSign: string) => Promise<L2AccountInfo>;
  deposit: (dispatch: AppDispatch, params: DepositParams) => Promise<SerializableTransactionReceipt>;
  disconnect: () => Promise<void>;
  reset: (dispatch: AppDispatch) => Promise<void>;
}

export interface DepositParams {
  tokenIndex: number;
  amount: number;
  l2account: L2AccountInfo;
  l1account: L1AccountInfo;
}

export interface WalletActionsType {
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  connectAndLoginL1: (dispatch: AppDispatch) => Promise<L1AccountInfo>;
  loginL2: (dispatch: AppDispatch, messageToSign: string) => Promise<L2AccountInfo>;
  deposit: (
    dispatch: AppDispatch,
    params: { tokenIndex: number; amount: number; l2account: L2AccountInfo; l1account: L1AccountInfo }
  ) => Promise<any>;
  reset: (dispatch: AppDispatch) => void;
}

export function useWalletActions(
  address?: string,
  chainId?: number
): WalletActionsHookReturn {

  const connectAndLoginL1 = useCallback(async (dispatch: AppDispatch) => {
    try {
      // Set to loading state
      dispatch(loginL1AccountAsync.pending('', undefined));
      
      // Reset provider state for reconnection but keep monitoring running
      resetProviderForReconnection();
      
      // Proactively validate and clean WalletConnect sessions before connecting
      try {
        console.log('🔍 Proactively validating WalletConnect sessions before L1 connection...');
        const { validateAndCleanWalletConnectStorage } = await import('../delphinus-provider');
        await validateAndCleanWalletConnectStorage();
        console.log('✅ WalletConnect session validation completed');
      } catch (validationError) {
        console.warn('⚠️ WalletConnect session validation failed, but continuing:', validationError);
        // Don't fail the connection, just log the warning
      }
      
      // Initialize Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // Try to validate and switch network, but don't fail the entire connection if it fails
        try {
          await validateAndSwitchNetwork(provider);
          console.log('✅ Network validation and switch successful');
        } catch (networkError) {
          console.warn('⚠️ Network switch failed, but continuing with current network:', networkError);
          // Don't throw here - let the connection proceed on the current network
        }
        
        // Get account address
        const connectedAddress = await provider.connect();
        const networkId = await provider.getNetworkId();
        
        return {
          address: connectedAddress,
          chainId: networkId.toString()
        };
      });
      
      // Get account address
      if (!result || !result.address) {
        throw createError(ERROR_MESSAGES.NO_ACCOUNT, 'NO_ACCOUNT');
      }
      
      // Use setL1Account action instead of fulfilled to avoid setting state to LoadingL2
      dispatch(setL1Account(result));
      return result;
    } catch (error) {
      console.error('L1 login failed:', error);
      dispatch(loginL1AccountAsync.rejected(error as any, '', undefined));
      throw error;
    }
  }, [address, chainId]);

  /**
   * L2 Account Login
   * @param dispatch Redux dispatch function
   * @param messageToSign Message content to sign, usually application name (required parameter)
   * @returns Promise<L2AccountInfo>
   */
  const loginL2 = useCallback(async (dispatch: AppDispatch, messageToSign: string) => {
    console.log('🚀 loginL2 called with:', { address, chainId, messageToSign });
    
    if (!messageToSign) {
      console.error('❌ No messageToSign provided');
      throw new Error('messageToSign is required for L2 login');
    }
    
    if (!address) {
      console.error('❌ No address available');
      throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
    }

    try {
      console.log('🔄 Starting L2 login process...');
      // Set to loading state
      dispatch(loginL2AccountAsync.pending('', messageToSign));
      
      // Ensure provider uses latest state
      console.log('🔧 Initializing rainbow provider...');
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      console.log('🎯 Calling withProvider...');
      const result = await withProvider(async (provider) => {
        console.log('📋 Inside withProvider, calling provider.sign()...');
        // Use provider to sign - Note: should sign messageToSign, not address
        const signature = await provider.sign(messageToSign);
        
        console.log('🔑 Got signature, creating L2Account...');
        // Create L2 account - use first 34 characters of signature (including 0x prefix)
        const l2Account = new L2AccountInfo(signature.substring(0, 34));
        
        return l2Account;
      });
      
      console.log('✅ L2 login successful, updating Redux state...');
      // Update Redux state
      dispatch(loginL2AccountAsync.fulfilled(result, '', messageToSign));
      return result;
    } catch (error) {
      console.error('❌ L2 login failed:', error);
      
      // Handle WalletConnect session errors automatically
      const errorMessage = (error as Error)?.message || String(error || '');
      if (errorMessage.includes('session expired') || 
          errorMessage.includes('No matching session') ||
          errorMessage.includes('session_request') ||
          errorMessage.includes('without any listeners')) {
        console.log('🔄 WalletConnect session error detected during L2 login, clearing invalid sessions...');
        
        // Use centralized cleanup function
        await handleWalletConnectSessionCleanup(dispatch);
        
        // Create a more descriptive error for the application (outside try-catch to avoid confusion)
        const sessionError = new Error('WalletConnect session expired. Your wallet has been automatically disconnected. Please reconnect to continue.');
        (sessionError as any).code = 'SESSION_MISMATCH';
        dispatch(loginL2AccountAsync.rejected(sessionError as any, '', messageToSign));
        throw sessionError;
      }
      
      dispatch(loginL2AccountAsync.rejected(error as any, '', messageToSign));
      throw error;
    }
  }, [address, chainId]);

  const deposit = useCallback(async (dispatch: AppDispatch, params: DepositParams) => {
    if (!address || !chainId) {
      throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
    }

    try {
      dispatch(depositAsync.pending('', params));
      
      // Initialize Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // Try to validate and switch network, but don't fail the deposit if network switch fails
        try {
          await validateAndSwitchNetwork(provider);
          console.log('✅ Network validation and switch successful for deposit');
        } catch (networkError) {
          console.warn('⚠️ Network switch failed for deposit, but continuing with current network:', networkError);
          // Note: Some deposits might fail if on wrong network, but that's better than complete failure
        }
        
        // Execute deposit operation (using unified utility function)
        return await executeDeposit(provider, params);
      });
      
      dispatch(depositAsync.fulfilled(result, '', params));
      return result;
    } catch (error) {
      console.error('Deposit failed:', error);
      dispatch(depositAsync.rejected(error as any, '', params));
      throw error;
    }
  }, [address, chainId]);

  const disconnect = useCallback(async () => {
    try {
      // Reset provider for reconnection but keep monitoring running
      resetProviderForReconnection();
      
      // Provider disconnected successfully
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  const reset = useCallback(async (dispatch: AppDispatch) => {
    await disconnect();
    dispatch(resetAccountState());
  }, [disconnect]);

  return {
    connectAndLoginL1,
    loginL2,
    deposit,
    disconnect,
    reset,
  };
} 