import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useConnection } from './useConnection';
import { useWalletActions } from './useWalletActions';
import type { RootState, AppDispatch } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

export interface WalletContextType {
  isConnected: boolean;
  isL2Connected: boolean;
  l1Account: any;
  l2Account: any;
  playerId: [string, string] | null;
  address: string | undefined;
  chainId: number | undefined;
  connectL1: () => Promise<void>;
  connectL2: () => Promise<void>;
  disconnect: () => void;
  setPlayerId: (id: [string, string]) => void;
}

/**
 * 统一的钱包上下文Hook，提供WalletContextType接口所需的所有功能
 * 这个hook整合了连接状态、账户信息、PID管理等功能
 */
export function useWalletContext(): WalletContextType {
  const dispatch = useDispatch<AppDispatch>();
  
  // 获取连接状态
  const { isConnected, address, chainId } = useConnection();
  
  // 获取钱包操作方法
  const { connectAndLoginL1, loginL2, disconnect: disconnectWallet } = useWalletActions(address, chainId);
  
  // 获取Redux状态
  const { l1Account, l2account } = useSelector((state: RootState) => state.account);
  
  // 计算派生状态
  const isL2Connected = useMemo(() => !!l2account, [l2account]);
  
  // 获取playerId (PID数组)
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
  
  // L1连接方法
  const connectL1 = useCallback(async () => {
    await connectAndLoginL1(dispatch);
  }, [connectAndLoginL1, dispatch]);
  
  // L2连接方法
  const connectL2 = useCallback(async () => {
    await loginL2(dispatch, "WalletContext");
  }, [loginL2, dispatch]);
  
  // 断开连接方法
  const disconnect = useCallback(() => {
    disconnectWallet();
  }, [disconnectWallet]);
  
  // 设置playerId方法 - 通过重新创建L2账户来实现
  const setPlayerId = useCallback((id: [string, string]) => {
    console.warn(
      'setPlayerId: PID是由L2账户的私钥派生的，无法直接设置。',
      '如需更改PID，请重新进行L2登录以生成新的L2账户。',
      '提供的PID:', id
    );
  }, []);
  
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
  };
} 