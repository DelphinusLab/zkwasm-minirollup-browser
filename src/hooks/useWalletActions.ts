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
import { resetAccountState } from '../store/account-slice';
import { clearProviderInstance } from '../providers/provider';
import type { L1AccountInfo, AppDispatch, SerializableTransactionReceipt } from '../types';

interface WalletActionsHookReturn {
  connectAndLoginL1: (dispatch: AppDispatch) => Promise<L1AccountInfo>;
  loginL2: (dispatch: AppDispatch, appName?: string) => Promise<L2AccountInfo>;
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

export function useWalletActions(
  address?: string,
  chainId?: number
): WalletActionsHookReturn {

  const connectAndLoginL1 = useCallback(async (dispatch: AppDispatch) => {
    try {
      // 初始化 Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // 验证并切换网络
        await validateAndSwitchNetwork(provider);
        
        // 获取账户地址
        const connectedAddress = await provider.connect();
        const networkId = await provider.getNetworkId();
        
        return {
          address: connectedAddress,
          chainId: networkId.toString()
        };
      });
      
      // 更新 Redux 状态
      dispatch(loginL1AccountAsync.fulfilled(result, '', undefined));
      return result;
    } catch (error) {
      console.error('L1 login failed:', error);
      dispatch(loginL1AccountAsync.rejected(error as any, '', undefined));
      throw error;
    }
  }, [address, chainId]);

  const loginL2 = useCallback(async (dispatch: AppDispatch, appName: string = "0xAUTOMATA") => {
    if (!address) {
      throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
    }

    try {
      // 初始化 Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // 使用 provider 签名 - 注意：应该签名 appName，不是地址
        const signature = await provider.sign(appName);
        console.log("signed result (new provider pattern)", signature);
        
        // 创建 L2 账户 - 使用签名的前34个字符（包括0x前缀）
        const l2Account = new L2AccountInfo(signature.substring(0, 34));
        return l2Account;
      });
      
      // 更新 Redux 状态
      dispatch(loginL2AccountAsync.fulfilled(result, '', appName));
      return result;
    } catch (error) {
      console.error('L2 login failed:', error);
      dispatch(loginL2AccountAsync.rejected(error as any, '', appName));
      throw error;
    }
  }, [address, chainId]);

  const deposit = useCallback(async (dispatch: AppDispatch, params: DepositParams) => {
    if (!address || !chainId) {
      throw createError(ERROR_MESSAGES.NO_WALLET, 'NO_WALLET');
    }

    try {
      dispatch(depositAsync.pending('', params));
      
      // 初始化 Provider
      await initializeRainbowProviderIfNeeded(address, chainId);
      
      const result = await withProvider(async (provider) => {
        // 验证并切换网络
        await validateAndSwitchNetwork(provider);
        
        // 执行存款操作（使用统一的工具函数）
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
      // 只清除 provider 实例但保留配置以供重新连接
      clearProviderInstance();
      
      // 如果是浏览器环境，提示用户
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('Provider disconnected. To fully disconnect, please disconnect from MetaMask manually.');
      }
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