import { useCallback } from 'react';
import { withProvider } from '../providers/provider';
import { 
  initializeRainbowProviderIfNeeded,
  validateAndSwitchNetwork,
  executeDeposit,
  ERROR_MESSAGES,
  createError
} from '../utils';
import { L2AccountInfo } from '../models/L2AccountInfo';
import { loginL1AccountAsync, loginL2AccountAsync, depositAsync } from '../store/thunks';
import { resetAccountState, setL1Account } from '../store/account-slice';
import { clearProviderInstance } from '../providers/provider';
import type { L1AccountInfo, AppDispatch, SerializableTransactionReceipt } from '../types';

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
      
      // Clear provider instance to ensure using latest wallet state
      clearProviderInstance();
      
      // Initialize Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // Validate and switch network
        await validateAndSwitchNetwork(provider);
        
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
    if (!messageToSign) {
      throw new Error('messageToSign is required for L2 login');
    }
    
    if (!address) {
      throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
    }

    try {
      // Set to loading state
      dispatch(loginL2AccountAsync.pending('', messageToSign));
      
      // Ensure provider uses latest state
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // Use provider to sign - Note: should sign messageToSign, not address
        const signature = await provider.sign(messageToSign);
        
        // Create L2 account - use first 34 characters of signature (including 0x prefix)
        const l2Account = new L2AccountInfo(signature.substring(0, 34));
        
        return l2Account;
      });
      
      // Update Redux state
      dispatch(loginL2AccountAsync.fulfilled(result, '', messageToSign));
      return result;
    } catch (error) {
      console.error('L2 login failed:', error);
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
        // Validate and switch network
        await validateAndSwitchNetwork(provider);
        
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
      // Only clear provider instance but keep configuration for reconnection
      clearProviderInstance();
      
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