import { Dispatch } from '@reduxjs/toolkit';
import { AccountState } from './account';

// Redux related types
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

// Window global types (unified declaration)
declare global {
  interface Window {
    ethereum?: any; // Keep any type to avoid conflicts, use type assertion when specifically used
    ENV?: Record<string, string>;
    APP_CONFIG?: Record<string, any>;
    __ENV__?: Record<string, string>;
  }
}

// Wagmi related types (avoid using any)
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

// RPC response types
export interface RpcResponse<T = any> {
  data: T;
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

// Error types
export interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  request?: any;
  message: string;
} 