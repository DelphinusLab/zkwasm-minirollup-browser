import { useCallback } from 'react';
import { useConnection } from './useConnection';
import { useWalletActions, type DepositParams } from './useWalletActions';
import type { AppDispatch } from '../types';

/**
 * 主要的 zkWasm 钱包 Hook
 * 整合连接状态管理和钱包操作功能
 */
export function useZkWasmWallet() {
  // 使用连接状态管理 hook
  const { isConnected, address, chainId } = useConnection();
  
  // 使用钱包操作 hook
  const walletActions = useWalletActions(address, chainId);

  // 使用 useCallback 稳定函数引用，避免无限循环
  const connectAndLoginL1 = useCallback(
    (dispatch: AppDispatch) => walletActions.connectAndLoginL1(dispatch),
    [walletActions.connectAndLoginL1]
  );

  const loginL2 = useCallback(
    (dispatch: AppDispatch, appName?: string) => walletActions.loginL2(dispatch, appName),
    [walletActions.loginL2]
  );

  const deposit = useCallback(
    (dispatch: AppDispatch, params: DepositParams) => walletActions.deposit(dispatch, params),
    [walletActions.deposit]
  );

  const reset = useCallback(
    (dispatch: AppDispatch) => walletActions.reset(dispatch),
    [walletActions.reset]
  );

  return {
    // 连接状态
    isConnected,
    address,
    chainId,
    
    // 钱包操作 (使用 useCallback 稳定函数引用)
    connectAndLoginL1,
    loginL2,
    deposit,
    disconnect: walletActions.disconnect,
    reset,
  };
}

// 导出细粒度的 hooks 供高级用户使用
export { useConnection } from './useConnection';
export { useWalletActions } from './useWalletActions'; 