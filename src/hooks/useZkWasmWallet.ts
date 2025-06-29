import { useConnection } from './useConnection';
import { useWalletActions, type DepositParams } from './useWalletActions';
import type { AppDispatch } from '../types';

/**
 * 主要的 zkWasm 钱包 Hook
 * 整合连接状态管理和钱包操作功能
 * 
 * @deprecated 为了保持向后兼容性，建议使用拆分后的 hooks:
 * - useConnection() 用于连接状态
 * - useWalletActions() 用于钱包操作
 */
export function useZkWasmWallet() {
  // 使用连接状态管理 hook
  const { isConnected, address, chainId } = useConnection();
  
  // 使用钱包操作 hook
  const walletActions = useWalletActions(address, chainId);

  return {
    // 连接状态
    isConnected,
    address,
    chainId,
    
    // 钱包操作 (注意：现在需要显式传递 dispatch)
    connectAndLoginL1: (dispatch: AppDispatch) => walletActions.connectAndLoginL1(dispatch),
    loginL2: (dispatch: AppDispatch, appName?: string) => walletActions.loginL2(dispatch, appName),
    deposit: (dispatch: AppDispatch, params: DepositParams) => 
      walletActions.deposit(dispatch, params),
    disconnect: walletActions.disconnect,
    reset: (dispatch: AppDispatch) => walletActions.reset(dispatch),
  };
}

// 导出细粒度的 hooks 供高级用户使用
export { useConnection } from './useConnection';
export { useWalletActions } from './useWalletActions'; 