export interface L1AccountInfo {
  address: string;
  chainId: string;
}

export interface L2AccountData {
  privateKey: string;
  publicKeyHex: string;
  pid1: string; 
  pid2: string; 
}

export interface SerializableTransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed?: string;
  status?: number;
  to?: string;
  from: string;
}

export interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: import('../models/L2AccountInfo').L2AccountInfo;
  status: 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
}

export interface State {
  account: AccountState;
}

export interface RainbowKitHooks {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  openConnectModal?: () => void;
  connect?: (config: any) => void;  // wagmi connect returns void
  connectors?: readonly any[];      // wagmi connectors are readonly
  signMessageAsync: (config: any) => Promise<string>;
  switchChain: (config: any) => void;  // wagmi switchChain returns void
} 