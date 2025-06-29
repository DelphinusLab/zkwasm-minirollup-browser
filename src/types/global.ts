import { Dispatch } from '@reduxjs/toolkit';
import { AccountState } from './account';

// Redux相关类型
export interface RootState {
  account: AccountState;
}

export type AppDispatch = Dispatch;

// Ethereum provider type
export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (accounts: string[]) => void) => void;
  removeListener: (event: string, handler: (accounts: string[]) => void) => void;
  isMetaMask?: boolean;
}

// 窗口全局类型 (统一声明)
declare global {
  interface Window {
    ethereum?: any; // 保持 any 类型以避免冲突，具体使用时进行类型断言
    ENV?: Record<string, string>;
    APP_CONFIG?: Record<string, any>;
    __ENV__?: Record<string, string>;
  }
}

// Wagmi 相关类型 (避免使用 any)
export interface WagmiAccountResult {
  address?: string;
  isConnected: boolean;
  chainId?: number;
}

export interface WagmiConnectResult {
  connect: (config: { connector: any }) => void;
  connectors: readonly any[];
}

export interface WagmiHookTypes {
  useAccount: () => WagmiAccountResult;
  useChainId: () => number;
  useSignMessage: () => { signMessageAsync: (config: { message: string }) => Promise<string> };
  useSwitchChain: () => { switchChain: (config: { chainId: number }) => void };
  useConnect: () => WagmiConnectResult;
  useDisconnect: () => { disconnect: () => void };
  useConnectModal?: () => { openConnectModal?: () => void };
}

// RPC 响应类型
export interface RpcResponse<T = any> {
  data: string;
  status?: number;
}

export interface ConfigResponse {
  chainId: number;
  contracts: {
    depositContract: string;
    tokenContract: string;
  };
}

export interface StateResponse {
  player: any;
  state: any;
}

// 错误类型
export interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  request?: any;
  message: string;
} 