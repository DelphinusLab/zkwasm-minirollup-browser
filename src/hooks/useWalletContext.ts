import { useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDisconnect } from 'wagmi';
import { useConnection } from './useConnection';
import { useWalletActions } from './useWalletActions';
import { depositAsync } from '../store/thunks';
import { resetAccountState } from '../store/account-slice';
import { useDelphinusContext } from '../delphinus-provider';
import type { RootState, AppDispatch, SerializableTransactionReceipt } from '../types';

export interface WalletContextType {
  isConnected: boolean;
  isL2Connected: boolean;
  l1Account: any | undefined;
  l2Account: any | undefined;
  playerId: [string, string] | null;
  address: string | undefined;
  chainId: number | undefined;
  connectL1: () => Promise<void>;
  /**
   * Connect L2 account - user will sign appName from Provider
   * 
   * This method will prompt user to sign application name in wallet to generate L2 account private key.
   * The signed message is the appName parameter passed to DelphinusReactProvider.
   */
  connectL2: () => Promise<void>;
  disconnect: () => Promise<void>;
  setPlayerId: (id: [string, string]) => void;
  deposit: (params: { tokenIndex: number; amount: number }) => Promise<SerializableTransactionReceipt>;
}

/**
 * Unified wallet context Hook, provides all functionality required by WalletContextType interface
 * This hook integrates connection status, account information, PID management and other functionality
 * 
 * ⚠️ Important Notice: L2 Login Signing
 * - connectL2() will use appName from Provider as signature message
 * - Users will see and sign your application name in wallet when connecting L2 account
 * - Same appName will generate the same L2 account for the same user
 * - Different appName will generate different L2 accounts for the same user
 * 
 * @returns WalletContextType Complete wallet context object
 */
export function useWalletContext(): WalletContextType {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get appName from Provider
  const { appName } = useDelphinusContext();
  
  // Get connection status from wagmi (single source of truth)
  const { isConnected, address, chainId } = useConnection();
  
  // Get wagmi disconnect functionality
  const { disconnect: wagmiDisconnect } = useDisconnect();
  
  // Get wallet operation methods
  const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
  
  // Get Redux state
  const { l1Account, l2account, status } = useSelector((state: RootState) => state.account);
  
  // Sync wagmi and Redux states with debouncing to prevent rapid state changes
  useEffect(() => {
    // Add a small delay to prevent rapid state changes during initialization
    const timeoutId = setTimeout(() => {
      // If wagmi disconnected but Redux still has account data, clear Redux
      if (!isConnected && l1Account) {
        console.warn('🔄 Wagmi disconnected but Redux still has L1 account, syncing...');
        dispatch(resetAccountState());
      }
      
      // If wagmi connected to different address than Redux, clear Redux L1 account
      if (isConnected && address && l1Account && l1Account.address?.toLowerCase() !== address.toLowerCase()) {
        console.warn('🔄 Address mismatch between wagmi and Redux, clearing Redux L1 account...', {
          wagmiAddress: address,
          reduxAddress: l1Account.address
        });
        dispatch(resetAccountState());
      }
    }, 100); // Small delay to debounce rapid changes

    return () => clearTimeout(timeoutId);
  }, [isConnected, address, l1Account, dispatch]);
  
  // Calculate derived state with cross-validation
  const isL2Connected = useMemo(() => !!l2account, [l2account]);
  
  // Unified connection state with consistency validation
  const connectionState = useMemo(() => {
    // wagmi is the authoritative source for connection status
    const wagmiConnected = Boolean(isConnected && address);
    
    // Redux L1 account should only be trusted if wagmi is also connected
    const validL1Account = Boolean(wagmiConnected && l1Account && 
      l1Account.address?.toLowerCase() === address?.toLowerCase());
    
    // L2 account is valid only if L1 is properly connected
    const validL2Account = Boolean(validL1Account && l2account);
    
    return {
      isConnected: wagmiConnected,
      isL1Ready: validL1Account,
      isL2Ready: validL2Account,
      address: wagmiConnected ? address : undefined,
      chainId: wagmiConnected ? chainId : undefined
    };
  }, [isConnected, address, chainId, l1Account, l2account]);
  
  // Get playerId (PID array)
  const playerId = useMemo((): [string, string] | null => {
    if (!l2account) return null;
    
    try {
      const [pid1, pid2] = l2account.getPidArray();
      return [pid1.toString(), pid2.toString()];
    } catch (error) {
      console.error('Failed to get PID array:', error);
      return null;
    }
  }, [l2account]);
  
  // L1 connection method
  const connectL1 = useCallback(async () => {
    // Prevent duplicate L1 connection attempts
    if (l1Account || status === 'LoadingL1') {
      console.log(`✅ L1 connection already ${l1Account ? 'completed' : 'in progress'}, skipping duplicate call`);
      return;
    }
    
    console.log('🔄 Starting L1 connection...');
    try {
      await connectAndLoginL1(dispatch);
    } catch (error: any) {
      console.error('L1 connection failed:', error);
      
      // Handle specific error types gracefully
      if (error?.message?.includes('User rejected')) {
        console.log('User cancelled connection - this is normal');
        return;
      }
      
      if (error?.message?.includes('Unrecognized chain ID')) {
        console.log('Network switching required - user should add/switch network manually');
        return;
      }
      
      // Re-throw other errors
      throw error;
    }
  }, [connectAndLoginL1, dispatch, l1Account, status]);
  
  // L2 connection method - use appName from Provider
  const connectL2 = useCallback(async () => {
    await loginL2(dispatch, appName);
  }, [loginL2, dispatch, appName]);
  
  // Disconnect method with atomic state synchronization
  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting wallet...');
    
    try {
      // Clear Redux state first to prevent UI showing stale data
      dispatch(resetAccountState());
      
      // Then disconnect wagmi (this may take time due to network operations)
      await wagmiDisconnect();
      
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
      
      // Even if wagmi disconnect fails, ensure Redux state is cleared
      dispatch(resetAccountState());
      
      // Re-throw to let caller handle if needed
      throw error;
    }
  }, [wagmiDisconnect, dispatch]);
  
  // Set playerId method - implemented by recreating L2 account
  const setPlayerId = useCallback((id: [string, string]) => {
    console.warn(
      'setPlayerId: PID is derived from L2 account private key and cannot be set directly.',
      'To change PID, please re-login L2 to generate a new L2 account.',
      'Provided PID:', id
    );
  }, []);
  
  // Deposit method with unified state validation
  const deposit = useCallback(async (params: { tokenIndex: number; amount: number }) => {
    // Use unified connection state for validation
    if (!connectionState.isL1Ready) {
      throw new Error('L1 account is not properly connected. Please reconnect your wallet.');
    }
    if (!connectionState.isL2Ready) {
      throw new Error('L2 account is not properly connected. Please complete L2 login.');
    }
    
    // Double-check wagmi connection before proceeding
    if (!connectionState.isConnected || !connectionState.address) {
      throw new Error('Wallet connection lost. Please reconnect.');
    }
  
    const result = await (dispatch as any)(depositAsync({
      tokenIndex: params.tokenIndex,
      amount: params.amount,
      l2account: l2account!,
      l1account: l1Account!
    }));
  
    if (depositAsync.rejected.match(result)) {
      throw new Error(result.error.message || 'Deposit failed');
    }
    return result.payload as SerializableTransactionReceipt;
  }, [dispatch, l1Account, l2account, connectionState]);
  
  return {
    // Use unified connection state for consistent external API
    isConnected: connectionState.isConnected,
    isL2Connected: connectionState.isL2Ready,
    l1Account: connectionState.isL1Ready ? l1Account : undefined,
    // Only hide l2Account if L1 is not ready, but keep it if L1 is ready but L2 validation failed
    l2Account: connectionState.isL1Ready ? l2account : undefined,
    playerId: connectionState.isL2Ready ? playerId : null,
    address: connectionState.address,
    chainId: connectionState.chainId,
    connectL1,
    connectL2,
    disconnect,
    setPlayerId,
    deposit,
  };
} 