import { useCallback, useMemo } from 'react';
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
  l1Account: any;
  l2Account: any;
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
  disconnect: () => void;
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
  
  // Get connection status
  const { isConnected, address, chainId } = useConnection();
  
  // Get wagmi disconnect functionality
  const { disconnect: wagmiDisconnect } = useDisconnect();
  
  // Get wallet operation methods
  const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
  
  // Get Redux state
  const { l1Account, l2account } = useSelector((state: RootState) => state.account);
  
  // Calculate derived state
  const isL2Connected = useMemo(() => !!l2account, [l2account]);
  
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
    await connectAndLoginL1(dispatch);
  }, [connectAndLoginL1, dispatch]);
  
  // L2 connection method - use appName from Provider
  const connectL2 = useCallback(async () => {
    await loginL2(dispatch, appName);
  }, [loginL2, dispatch, appName]);
  
  // Disconnect method
  const disconnect = useCallback(() => {
    // First disconnect wagmi connection
    wagmiDisconnect();
    
    // Then clear Redux state
    dispatch(resetAccountState());
  }, [wagmiDisconnect, dispatch]);
  
  // Set playerId method - implemented by recreating L2 account
  const setPlayerId = useCallback((id: [string, string]) => {
    console.warn(
      'setPlayerId: PID is derived from L2 account private key and cannot be set directly.',
      'To change PID, please re-login L2 to generate a new L2 account.',
      'Provided PID:', id
    );
  }, []);
  
  // Deposit method
  const deposit = useCallback(async (params: { tokenIndex: number; amount: number }) => {
    if (!l1Account) {
      throw new Error('L1 account is not connected');
    }
    if (!l2account) {
      throw new Error('L2 account is not connected');
    }
  
    const result = await (dispatch as any)(depositAsync({
      tokenIndex: params.tokenIndex,
      amount: params.amount,
      l2account: l2account,
      l1account: l1Account
    }));
  
    if (depositAsync.rejected.match(result)) {
      throw new Error(result.error.message || 'Deposit failed');
    }
    return result.payload as SerializableTransactionReceipt;
  }, [dispatch, l1Account, l2account]);
  
  return {
    isConnected,
    isL2Connected,
    l1Account,
    l2Account: l2account,
    playerId,
    address,
    chainId,
    connectL1,
    connectL2,
    disconnect,
    setPlayerId,
    deposit,
  };
} 