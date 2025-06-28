import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { useState, useEffect, useCallback } from 'react';
import BN from "bn.js";
import { PrivateKey, bnToHexLe } from "delphinus-curves/src/altjubjub";
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { signMessage } from "./address.js";
import { withProvider } from "./provider.js";
import { DelphinusProvider } from './provider.js';
import { withRainbowKitConnector, reinitializeRainbowProvider } from './rainbow-adapter.js';
import { getChainId, getDepositContract, getTokenContract, getEnvConfig } from './env-adapter.js';

export interface L1AccountInfo {
  address: string;
  chainId: string;
}

// 可序列化的 L2 账户信息接口
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

export class L2AccountInfo {
  #prikey: string;
  pubkey: BN;
  constructor(address0x: string) {
    this.#prikey= address0x.substring(2);
    const pkey = PrivateKey.fromString(this.#prikey);
    this.pubkey = pkey.publicKey.key.x.v;
  }
  getPrivateKey() {
    return this.#prikey;
  }
  toHexStr(): string {
    return this.pubkey.toString("hex")
  }
 
  getPidArray(): [bigint, bigint] {
    const leHexBN = new LeHexBN(bnToHexLe(this.pubkey));
    const pkeyArray = leHexBN.toU64Array();
    return [pkeyArray[1], pkeyArray[2]];
  }

  toSerializableData(): L2AccountData {
    const [pid1, pid2] = this.getPidArray();
    return {
      privateKey: this.#prikey,
      publicKeyHex: this.toHexStr(),
      pid1: pid1.toString(),
      pid2: pid2.toString()
    };
  }

  static fromSerializableData(data: L2AccountData): L2AccountInfo {
    return new L2AccountInfo('0x' + data.privateKey);
  }
}

async function loginL1Account() {
  return await withProvider(async (web3: DelphinusProvider) => {
    const chainidhex = "0x" + getChainId().toString(16);
    await web3.switchNet(chainidhex);
    const i = await web3.getJsonRpcSigner();
    return {
        address: await i.getAddress(),
        chainId: (await web3.getNetworkId()).toString()
    }
  });
}

// RainbowKit 版本的 L1 账户登录函数
async function loginL1AccountWithRainbowKit(rainbowKitHooks: any) {
  // 如果没有连接钱包，先打开连接模态框
  if (!rainbowKitHooks.isConnected || !rainbowKitHooks.address) {
    console.log('Wallet not connected, opening connect modal...');
    if (rainbowKitHooks.openConnectModal) {
      rainbowKitHooks.openConnectModal();
    }
    // 不抛出错误，而是等待用户连接钱包
    throw new Error('Wallet connection required - please connect your wallet using the modal');
  }

  return await withRainbowKitConnector(async (adapter: DelphinusProvider) => {
    const targetChainId = getChainId();
    
    console.log('Target chain ID:', targetChainId, 'Current chain ID:', rainbowKitHooks.chainId);
    
    // 检查当前链是否正确，如果不正确则切换
    if (rainbowKitHooks.chainId !== targetChainId) {
      console.log('Switching to target chain:', targetChainId);
      
      try {
        await rainbowKitHooks.switchChain({ chainId: targetChainId });
        
        // 等待网络切换完成
        console.log('Waiting for network switch to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (switchError: any) {
        console.error('Failed to switch chain:', switchError);
        
        // 如果自动切换失败，给用户友好的提示
        if (switchError.code === 4902) {
          throw new Error(`Please add chain ${targetChainId} to your wallet and switch to it manually.`);
        } else {
          throw new Error(`Please switch to chain ${targetChainId} manually in your wallet.`);
        }
      }
    }
    
    // 不依赖 rainbowKitHooks.chainId，直接检查提供者的网络
    let currentNetwork;
    try {
      currentNetwork = await adapter.getNetworkId();
      console.log('Current network ID from provider:', currentNetwork.toString());
    } catch (error) {
      console.error('Failed to get network ID, reinitializing adapter...');
      // 如果获取网络 ID 失败，重新初始化适配器
      await reinitializeRainbowProvider(rainbowKitHooks.address, targetChainId);
      currentNetwork = await adapter.getNetworkId();
    }
    
    // 验证网络是否正确
    if (currentNetwork.toString() !== targetChainId.toString()) {
      console.error(`Network mismatch: expected ${targetChainId}, got ${currentNetwork.toString()}`);
      throw new Error(`Please manually switch to chain ${targetChainId} in your wallet. Current chain: ${currentNetwork.toString()}`);
    }
    
    const signer = await adapter.getJsonRpcSigner();
    const result = {
      address: await signer.getAddress(),
      chainId: currentNetwork.toString()
    };
    
    console.log('L1 account login result:', result);
    return result;
  }, rainbowKitHooks);
}

async function loginL2Account(address: string): Promise<L2AccountInfo> {
  const str:string = await signMessage(address);
  console.log("signed result", str);
  return new L2AccountInfo(str.substring(0,34));
}

// RainbowKit 版本的 L2 账户登录函数
async function loginL2AccountWithRainbowKit(address: string, rainbowKitHooks: any): Promise<L2AccountInfo> {
  // 使用 RainbowKit 的签名功能
  const signature = await rainbowKitHooks.signMessageAsync({ message: address });
  console.log("signed result (RainbowKit)", signature);
  return new L2AccountInfo(signature.substring(0,34));
}

const contractABI = {
  tokenABI: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  ],
  proxyABI: [
    {
      "inputs": [
        {
          "internalType": "uint128",
          "name": "tidx",
          "type": "uint128"
        },
        {
          "internalType": "uint64",
          "name": "pid_1",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "pid_2",
          "type": "uint64"
        },
        {
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        }
      ],
      "name": "topup",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
};

async function deposit(chainId: number, tokenIndex: number, amount: number, l2account: L2AccountInfo, l1account: L1AccountInfo) {
  try {
    const txReceipt = await withProvider(async (connector: DelphinusProvider) => {
      const chainidhex = "0x" + getChainId().toString(16);
      await connector.switchNet(chainidhex);
      //const pkey = PrivateKey.fromString(prikey.address);
      //const pubkey = pkey.publicKey.key.x.v;
      const pubkey = l2account.pubkey;
      const leHexBN =new LeHexBN(bnToHexLe(pubkey));
      const pkeyArray = leHexBN.toU64Array();
      const proxyAddr = process.env.REACT_APP_DEPOSIT_CONTRACT!;
      const tokenAddr = process.env.REACT_APP_TOKEN_CONTRACT!;
      const tokenContract = await connector.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      const tokenContractReader = connector.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      const balance = await tokenContractReader.getEthersContract().balanceOf(l1account.address);
      const allowance = await tokenContractReader.getEthersContract().allowance(l1account.address, proxyAddr);
      console.log("balance is:", balance);
      console.log("allowance is:", allowance);
      let a = new BN(amount);
      let b = new BN("10").pow(new BN(18));
      const amountWei = a.mul(b);
      if (allowance < amountWei) {
        if (balance >= amountWei) {
          const tx = await tokenContract.getEthersContract().approve(proxyAddr, balance);
          await tx.wait();
        } else {
          throw Error("Not enough balance for approve");
        }
      }
      const proxyContract = await connector.getContractWithSigner(proxyAddr, JSON.stringify(contractABI.proxyABI));
      const tx = await proxyContract.getEthersContract().topup.send(
        Number(tokenIndex),
        pkeyArray[1],
        pkeyArray[2],
        BigInt(amountWei.toString()),
      );
      const txReceipt = await tx.wait();
      // wait for tx to be mined, can add no. of confirmations as arg
      return txReceipt
      // tx.hash
    });
    return txReceipt;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

// RainbowKit 版本的存款函数
async function depositWithRainbowKit(
  chainId: number, 
  tokenIndex: number, 
  amount: number, 
  l2account: L2AccountInfo, 
  l1account: L1AccountInfo,
  rainbowKitHooks: any
) {
  try {
    const txReceipt = await withRainbowKitConnector(async (adapter: DelphinusProvider) => {
      const targetChainId = getChainId();
      
      console.log('Deposit: checking chain ID', { current: rainbowKitHooks.chainId, target: targetChainId });
      
      // 检查当前链是否正确，如果不正确则切换
      if (rainbowKitHooks.chainId !== targetChainId) {
        console.log('Deposit: switching to target chain:', targetChainId);
        await rainbowKitHooks.switchChain({ chainId: targetChainId });
      }

      const pubkey = l2account.pubkey;
      const leHexBN = new LeHexBN(bnToHexLe(pubkey));
      const pkeyArray = leHexBN.toU64Array();
      const proxyAddr = getDepositContract();
      const tokenAddr = getTokenContract();
      
      console.log('Deposit: contract addresses', { proxyAddr, tokenAddr });
      
      if (!proxyAddr || !tokenAddr) {
        throw new Error("Deposit contract or token contract address not configured");
      }
      
      const tokenContract = await adapter.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      const tokenContractReader = adapter.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      
      const balance = await tokenContractReader.getEthersContract().balanceOf(l1account.address);
      const allowance = await tokenContractReader.getEthersContract().allowance(l1account.address, proxyAddr);
      
      console.log("Deposit: token balance:", balance.toString());
      console.log("Deposit: allowance:", allowance.toString());
      
      let a = new BN(amount);
      let b = new BN("10").pow(new BN(18));
      const amountWei = a.mul(b);
      
      console.log("Deposit: amount in wei:", amountWei.toString());
      
      if (allowance < amountWei) {
        console.log("Deposit: need to approve, current allowance insufficient");
        if (balance >= amountWei) {
          console.log("Deposit: approving token spend...");
          const tx = await tokenContract.getEthersContract().approve(proxyAddr, balance);
          console.log("Deposit: approval transaction sent:", tx.hash);
          await tx.wait();
          console.log("Deposit: approval transaction confirmed");
        } else {
          throw Error(`Not enough balance for deposit. Required: ${amountWei.toString()}, Available: ${balance.toString()}`);
        }
      }
      
      const proxyContract = await adapter.getContractWithSigner(proxyAddr, JSON.stringify(contractABI.proxyABI));
      console.log("Deposit: calling topup function with params:", {
        tokenIndex: Number(tokenIndex),
        pid1: pkeyArray[1],
        pid2: pkeyArray[2], 
        amount: BigInt(amountWei.toString())
      });
      
      const tx = await proxyContract.getEthersContract().topup(
        Number(tokenIndex),
        pkeyArray[1],
        pkeyArray[2],
        BigInt(amountWei.toString()),
      );
      console.log("Deposit: topup transaction sent:", tx.hash);
      const txReceipt = await tx.wait();
      console.log("Deposit: topup transaction confirmed:", txReceipt);
      return txReceipt;
    }, rainbowKitHooks);
    return txReceipt;
  } catch (e) {
    console.error("Deposit error:", e);
    throw e;
  }
}

export interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: L2AccountInfo;  // 恢复使用 L2AccountInfo
  status: 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
}

export interface State {
  account: AccountState;
}

const initialState: AccountState = {
  status: 'Ready',
};

// The function below is called a thunk and allows us to perform async logic. It
// can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
// will call the thunk with the `dispatch` function as the first argument. Async
// code can then be executed and other actions can be dispatched. Thunks are
// typically used to make async requests.
export const loginL1AccountAsync = createAsyncThunk(
  'acccount/fetchAccount',
  async (thunkApi) => {
    const account = await loginL1Account();
    return account;
  }
);

export const loginL2AccountAsync = createAsyncThunk(
  'acccount/deriveL2Account',
  async (appName:string,  thunkApi) => {
    const l2account = await loginL2Account(appName);
    return l2account;  // 直接返回 L2AccountInfo 实例
  }
);

export const depositAsync = createAsyncThunk(
  'acccount/deposit',
  async (params: {tokenIndex: number, amount: number, l2account: L2AccountInfo, l1account: L1AccountInfo} ,  thunkApi) => {
    const txReceipt = await deposit(getChainId(), params.tokenIndex, params.amount, params.l2account, params.l1account);
    
    if (!txReceipt) {
      throw new Error('Transaction failed: no receipt received');
    }
    
    // 只返回可序列化的交易信息
    return {
      hash: txReceipt.hash,
      blockNumber: txReceipt.blockNumber,
      blockHash: txReceipt.blockHash,
      gasUsed: txReceipt.gasUsed?.toString(),
      status: txReceipt.status,
      to: txReceipt.to,
      from: txReceipt.from
    };
  }
);

// RainbowKit 版本的 thunk 函数
export const loginL1AccountWithRainbowKitAsync = createAsyncThunk(
  'account/fetchAccountRainbowKit',
  async (rainbowKitHooks: any, thunkApi) => {
    const account = await loginL1AccountWithRainbowKit(rainbowKitHooks);
    return account;
  }
);

export const loginL2AccountWithRainbowKitAsync = createAsyncThunk(
  'account/deriveL2AccountRainbowKit',
  async (params: {appName: string, rainbowKitHooks: any}, thunkApi) => {
    const l2account = await loginL2AccountWithRainbowKit(params.appName, params.rainbowKitHooks);
    return l2account;  // 直接返回 L2AccountInfo 实例
  }
);

export const depositWithRainbowKitAsync = createAsyncThunk(
  'account/depositRainbowKit',
  async (params: {
    tokenIndex: number, 
    amount: number, 
    l2account: L2AccountInfo, 
    l1account: L1AccountInfo,
    rainbowKitHooks: any
  }, thunkApi) => {
    const txReceipt = await depositWithRainbowKit(
      getChainId(), 
      params.tokenIndex, 
      params.amount, 
      params.l2account, 
      params.l1account,
      params.rainbowKitHooks
    );
    
    if (!txReceipt) {
      throw new Error('Transaction failed: no receipt received');
    }
    
    // 只返回可序列化的交易信息
    return {
      hash: txReceipt.hash,
      blockNumber: txReceipt.blockNumber,
      blockHash: txReceipt.blockHash,
      gasUsed: txReceipt.gasUsed?.toString(),
      status: txReceipt.status,
      to: txReceipt.to,
      from: txReceipt.from
    };
  }
);

// 完整的钱包连接和 L1 登录流程
export const connectWalletAndLoginL1Async = createAsyncThunk(
  'account/connectAndLoginL1',
  async (_, thunkApi) => {
    // 这个函数需要在 React 组件中调用，因为需要使用 hooks
    throw new Error('This function should be called from a React component with RainbowKit hooks');
  }
);

// 为外部使用提供的连接函数，需要传入 RainbowKit hooks
export const connectWalletAndLoginL1WithHooksAsync = createAsyncThunk(
  'account/connectAndLoginL1WithHooks',
  async (rainbowKitHooks: {
    isConnected: boolean;
    address?: string;
    chainId?: number;
    openConnectModal?: () => void;
    connect?: (config: any) => void;  // wagmi 的 connect 返回 void
    connectors?: readonly any[];      // wagmi 的 connectors 是 readonly
    signMessageAsync: (config: any) => Promise<string>;
    switchChain: (config: any) => void;  // wagmi 的 switchChain 返回 void
  }, thunkApi) => {
    // 如果钱包没有连接，先尝试连接
    if (!rainbowKitHooks.isConnected || !rainbowKitHooks.address) {
      console.log('Wallet not connected, attempting to connect...');
      
      // 优先使用 openConnectModal
      if (rainbowKitHooks.openConnectModal) {
        console.log('Opening RainbowKit connect modal...');
        rainbowKitHooks.openConnectModal();
        throw new Error('Please connect your wallet using the modal');
      }
      
      // 备用方案：尝试自动连接第一个连接器
      if (rainbowKitHooks.connect && rainbowKitHooks.connectors && rainbowKitHooks.connectors.length > 0) {
        try {
          console.log('Attempting auto-connect with first connector...');
          rainbowKitHooks.connect({ connector: rainbowKitHooks.connectors[0] });
          // 连接是异步的，但函数立即返回，所以我们等待连接状态更新
          throw new Error('Wallet connection initiated. Please wait for connection to complete and try again.');
        } catch (connectError) {
          console.error('Auto-connect failed:', connectError);
          throw new Error('Failed to connect wallet automatically. Please connect manually.');
        }
      } else {
        throw new Error('No wallet connection method available. Please ensure RainbowKit is properly configured.');
      }
    }
    
    // 钱包已连接，进行 L1 登录
    console.log('Wallet connected, proceeding with L1 login...');
    const account = await loginL1AccountWithRainbowKit(rainbowKitHooks);
    return account;
  }
);

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setL1Account: (state, action) => {
      state.l1Account = action.payload;
    },
    resetAccountState: (state) => {
      state.l1Account = undefined;
      state.l2account = undefined;
      state.status = 'Ready';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginL1AccountAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountAsync.fulfilled, (state, c) => {
        state.status = 'LoadingL2';
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })
      .addCase(loginL2AccountAsync.pending, (state) => {
        state.status = 'LoadingL2';
      })
      .addCase(loginL2AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c);
        state.l2account = c.payload;
      })
      .addCase(depositAsync.pending, (state) => {
        state.status = 'Deposit';
        console.log("deposit async is pending ....");
      })
      .addCase(depositAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c.payload);
      })
      // RainbowKit 版本的 action 处理
      .addCase(loginL1AccountWithRainbowKitAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountWithRainbowKitAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountWithRainbowKitAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })
      .addCase(loginL2AccountWithRainbowKitAsync.pending, (state) => {
        state.status = 'LoadingL2';
      })
      .addCase(loginL2AccountWithRainbowKitAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c);
        state.l2account = c.payload;
      })
      .addCase(loginL2AccountWithRainbowKitAsync.rejected, (state, c) => {
        state.status = 'L2AccountError';
      })
      .addCase(depositWithRainbowKitAsync.pending, (state) => {
        state.status = 'Deposit';
        console.log("deposit async is pending (RainbowKit) ....");
      })
      .addCase(depositWithRainbowKitAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c.payload);
      })
      .addCase(depositWithRainbowKitAsync.rejected, (state, c) => {
        state.status = 'Ready';
        console.error('Deposit failed:', c.error);
      })
      // 完整的连接和登录流程
      .addCase(connectWalletAndLoginL1WithHooksAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // L1 登录成功后应该是 Ready 状态
        state.l1Account = c.payload;
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })

  },
});

// 便利类型定义，供外部项目使用
export interface RainbowKitHooks {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  openConnectModal?: () => void;
  connect?: (config: any) => void;  // wagmi 的 connect 返回 void
  connectors?: readonly any[];      // wagmi 的 connectors 是 readonly
  signMessageAsync: (config: any) => Promise<string>;
  switchChain: (config: any) => void;  // wagmi 的 switchChain 返回 void
}

// 便利函数：创建 RainbowKit hooks 对象
export function createRainbowKitHooks(wagmiHooks: {
  useAccount: () => any;
  useChainId: () => number;
  useSignMessage: () => any;
  useSwitchChain: () => any;
  useConnect: () => any;
  useConnectModal: () => any;
}): RainbowKitHooks {
  const { address, isConnected } = wagmiHooks.useAccount();
  const chainId = wagmiHooks.useChainId();
  const { signMessageAsync } = wagmiHooks.useSignMessage();
  const { switchChain } = wagmiHooks.useSwitchChain();
  const { connect, connectors } = wagmiHooks.useConnect();
  const { openConnectModal } = wagmiHooks.useConnectModal();

  return {
    isConnected,
    address,
    chainId,
    openConnectModal,
    connect,
    connectors,
    signMessageAsync,
    switchChain,
  };
}

export const selectL1Account = <T extends State>(state: T) => state.account.l1Account;
export const selectL2Account = <T extends State>(state: T) => state.account.l2account;
export const selectLoginStatus = <T extends State>(state: T) => state.account.status;

export const { setL1Account, resetAccountState } = accountSlice.actions;

export default accountSlice.reducer;

// SDK React Hook - 使用新的 Provider 模式
export function useZkWasmWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  // 检查钱包连接状态
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // 直接检查 ethereum 对象而不通过 provider
        if (!(window as any).ethereum) {
          setIsConnected(false);
          setAddress(undefined);
          setChainId(undefined);
          return;
        }

        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_accounts' 
        }) || [];
        
        if (accounts.length > 0) {
          // 如果有账户，获取网络信息
          try {
            const result = await withProvider(async (provider) => {
              const networkId = await provider.getNetworkId();
  return {
                isConnected: true,
                address: accounts[0],
                chainId: Number(networkId)
              };
            });
            
            setIsConnected(result.isConnected);
            setAddress(result.address);
            setChainId(result.chainId);
          } catch (error) {
            // 即使有账户，如果 provider 有问题也设为未连接
            console.warn('Provider error while checking connection:', error);
            setIsConnected(false);
            setAddress(undefined);
            setChainId(undefined);
          }
        } else {
          setIsConnected(false);
          setAddress(undefined);
          setChainId(undefined);
        }
      } catch (error) {
        // Provider 不可用或未连接
        console.warn('Connection check error:', error);
        setIsConnected(false);
        setAddress(undefined);
        setChainId(undefined);
      }
    };

    checkConnection();

    // 监听账户变化
    if ((window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
        } else {
          setIsConnected(false);
          setAddress(undefined);
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      };

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);

      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connectAndLoginL1 = useCallback(async (dispatch: any) => {
    try {
      // 首先检查是否需要初始化 RainbowKit provider
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      
      // 如果是 rainbow 类型，需要先获取账户信息来初始化
      let currentProvider;
      try {
        currentProvider = await getProvider();
      } catch (error) {
        // Provider 还未创建，这是正常的
        console.log('Provider not yet created, will create after wallet connection');
      }
      
      // 如果是 RainbowKit provider 但未初始化，需要先连接钱包获取信息
      if (currentProvider instanceof DelphinusRainbowConnector) {
        // 检查是否已经初始化
        try {
          await currentProvider.connect();
        } catch (error) {
          // 未初始化，需要先获取账户信息
          console.log('RainbowKit provider needs initialization');
          
          // 直接从 MetaMask 获取账户信息
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            const accounts = await (window as any).ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            const chainId = await (window as any).ethereum.request({ 
              method: 'eth_chainId' 
            });
            
            if (accounts.length > 0) {
              // 初始化 RainbowKit provider
              await currentProvider.initialize(accounts[0], parseInt(chainId, 16));
            }
          }
        }
      }
      
      const result = await withProvider(async (provider) => {
        // 连接钱包
        const connectedAddress = await provider.connect();
        const networkId = await provider.getNetworkId();
        
        // 更新状态
        setIsConnected(true);
        setAddress(connectedAddress);
        setChainId(Number(networkId));
        
        // 执行 L1 登录
        const l1Account: L1AccountInfo = {
          address: connectedAddress,
          chainId: networkId.toString()
        };
        
        return l1Account;
      });
      
      // 更新 Redux 状态
      dispatch(setL1Account(result));
      return result;
    } catch (error) {
      console.error('Connect and L1 login failed:', error);
      throw error;
    }
  }, []);

  const loginL2 = useCallback(async (dispatch: any, appName: string = "0xAUTOMATA") => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // 确保 RainbowKit provider 已初始化
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      const currentProvider = await getProvider();
      
      if (currentProvider instanceof DelphinusRainbowConnector && address && chainId) {
        try {
          await currentProvider.connect();
        } catch (error) {
          // 如果连接失败，重新初始化
          console.log('Re-initializing RainbowKit provider for L2 login');
          await currentProvider.initialize(address as `0x${string}`, chainId);
        }
      }
      
      const result = await withProvider(async (provider) => {
        // 使用 provider 签名 - 注意：应该签名 appName，而不是 address
        const signature = await provider.sign(appName);
        console.log("signed result (new provider pattern)", signature);
        
        // 创建 L2 账户 - 使用签名结果的前34个字符（包含0x前缀）
        const l2Account = new L2AccountInfo(signature.substring(0, 34));
        return l2Account;
      });
      
      // 更新 Redux 状态
      dispatch(loginL2AccountWithRainbowKitAsync.fulfilled(result, '', { appName, rainbowKitHooks: {} }));
      return result;
    } catch (error) {
      console.error('L2 login failed:', error);
      dispatch(loginL2AccountWithRainbowKitAsync.rejected(error as any, '', { appName, rainbowKitHooks: {} }));
      throw error;
    }
  }, [address, chainId]);

  const deposit = useCallback(async (dispatch: any, params: {
    tokenIndex: number;
    amount: number;
    l2account: L2AccountInfo;
    l1account: L1AccountInfo;
  }) => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    try {
      dispatch(depositWithRainbowKitAsync.pending('', { ...params, rainbowKitHooks: {} }));
      
      // 确保 RainbowKit provider 已初始化
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      const currentProvider = await getProvider();
      
      if (currentProvider instanceof DelphinusRainbowConnector && address && chainId) {
        try {
          await currentProvider.connect();
        } catch (error) {
          // 如果连接失败，重新初始化
          console.log('Re-initializing RainbowKit provider for deposit');
          await currentProvider.initialize(address as `0x${string}`, chainId);
        }
      }
      
      const result = await withProvider(async (provider) => {
        // 确保网络正确
        const targetChainId = getChainId();
        const chainidhex = "0x" + targetChainId.toString(16);
        await provider.switchNet(chainidhex);
        
        // 计算 PID 数组
        const pubkey = params.l2account.pubkey;
        const leHexBN = new LeHexBN(bnToHexLe(pubkey));
        const pkeyArray = leHexBN.toU64Array();
        
        // 获取合约地址
        const envConfig = getEnvConfig();
        const proxyAddr = envConfig.depositContract;
        const tokenAddr = envConfig.tokenContract;
        
        console.log('Deposit: contract addresses', { proxyAddr, tokenAddr });
        
        if (!proxyAddr || !tokenAddr) {
          throw new Error("Deposit contract or token contract address not configured");
        }
        
        // 获取合约实例
        const tokenContract = await provider.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
        const tokenContractReader = provider.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
        
        // 检查余额和授权
        const balance = await tokenContractReader.getEthersContract().balanceOf(params.l1account.address);
        const allowance = await tokenContractReader.getEthersContract().allowance(params.l1account.address, proxyAddr);
        
        console.log("Deposit: token balance:", balance.toString());
        console.log("Deposit: allowance:", allowance.toString());
        
        // 计算金额（转换为 wei）
        let a = new BN(params.amount);
        let b = new BN("10").pow(new BN(18));
        const amountWei = a.mul(b);
        
        console.log("Deposit: amount in wei:", amountWei.toString());
        
        // 如果授权不足，先进行授权
        if (allowance < amountWei) {
          console.log("Deposit: need to approve, current allowance insufficient");
          if (balance >= amountWei) {
            console.log("Deposit: approving token spend...");
            const tx = await tokenContract.getEthersContract().approve(proxyAddr, balance);
            console.log("Deposit: approval transaction sent:", tx.hash);
            await tx.wait();
            console.log("Deposit: approval transaction confirmed");
          } else {
            throw Error(`Not enough balance for deposit. Required: ${amountWei.toString()}, Available: ${balance.toString()}`);
          }
        }
        
        // 执行存款交易
        const proxyContract = await provider.getContractWithSigner(proxyAddr, JSON.stringify(contractABI.proxyABI));
        console.log("Deposit: calling topup function with params:", {
          tokenIndex: Number(params.tokenIndex),
          pid1: pkeyArray[1],
          pid2: pkeyArray[2], 
          amount: BigInt(amountWei.toString())
        });
        
        const tx = await proxyContract.getEthersContract().topup(
          Number(params.tokenIndex),
          pkeyArray[1],
          pkeyArray[2],
          BigInt(amountWei.toString()),
        );
        console.log("Deposit: topup transaction sent:", tx.hash);
        const txReceipt = await tx.wait();
        console.log("Deposit: topup transaction confirmed:", txReceipt);
        
        // 返回符合预期格式的交易回执
        return {
          hash: txReceipt.hash,
          blockNumber: txReceipt.blockNumber,
          blockHash: txReceipt.blockHash,
          gasUsed: txReceipt.gasUsed?.toString(),
          status: txReceipt.status,
          to: txReceipt.to,
          from: txReceipt.from
        };
      });
      
      dispatch(depositWithRainbowKitAsync.fulfilled(result, '', { ...params, rainbowKitHooks: {} }));
      return result;
    } catch (error) {
      console.error('Deposit failed:', error);
      dispatch(depositWithRainbowKitAsync.rejected(error as any, '', { ...params, rainbowKitHooks: {} }));
      throw error;
    }
  }, [address, chainId]);

  const disconnect = useCallback(async () => {
    try {
      // 只清理 provider 实例，但保留配置，这样可以重新连接
      const { clearProviderInstance } = await import('./provider');
      clearProviderInstance();
      
      // 如果是浏览器环境，提示用户
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('Provider disconnected. To fully disconnect, please disconnect from MetaMask manually.');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      // 清理本地状态
      setIsConnected(false);
      setAddress(undefined);
      setChainId(undefined);
    }
  }, []);

  const reset = useCallback(async (dispatch: any) => {
    await disconnect();
    dispatch(resetAccountState());
  }, [disconnect]);

  return {
    // 状态
    isConnected,
    address,
    chainId,
    
    // 动作
    connectAndLoginL1,
    loginL2,
    deposit,
    disconnect,
    reset,
  };
}

// 便利函数：初始化 SDK Hook，外部项目调用一次即可
export function createZkWasmWalletHook(wagmiHooks: {
  useAccount: any;
  useChainId: any;
  useSignMessage: any;
  useSwitchChain: any;
  useConnect: any;
  useDisconnect: any;
  useConnectModal?: any;
}) {
  return function useZkWasmWallet() {
    const { address, isConnected } = wagmiHooks.useAccount();
    const chainId = wagmiHooks.useChainId();
    const { signMessageAsync } = wagmiHooks.useSignMessage();
    const { switchChain } = wagmiHooks.useSwitchChain();
    const { connect, connectors } = wagmiHooks.useConnect();
    const { disconnect } = wagmiHooks.useDisconnect();
    const { openConnectModal } = wagmiHooks.useConnectModal ? wagmiHooks.useConnectModal() : { openConnectModal: undefined };

    const connectAndLoginL1 = (dispatch: any) => {
      const rainbowKitHooks: RainbowKitHooks = {
        isConnected,
        address,
        chainId,
        openConnectModal,
        connect,
        connectors,
        signMessageAsync,
        switchChain,
      };
      
      return dispatch(connectWalletAndLoginL1WithHooksAsync(rainbowKitHooks));
    };

    const loginL2 = (dispatch: any, appName: string = "0xAUTOMATA") => {
      const rainbowKitHooks = {
        address,
        chainId,
        signMessageAsync,
        switchChain,
        isConnected
      };
      
      return dispatch(loginL2AccountWithRainbowKitAsync({
        appName,
        rainbowKitHooks
      }));
    };

    const deposit = (dispatch: any, params: {
      tokenIndex: number;
      amount: number;
      l2account: L2AccountInfo;
      l1account: L1AccountInfo;
    }) => {
      const rainbowKitHooks = {
        address,
        chainId,
        signMessageAsync,
        switchChain,
        isConnected
      };
      
      return dispatch(depositWithRainbowKitAsync({
        ...params,
        rainbowKitHooks
      }));
    };

    const reset = (dispatch: any) => {
      disconnect();
      dispatch(resetAccountState());
    };

    return {
      // 状态
      isConnected,
      address,
      chainId,
      
      // 动作
      connectAndLoginL1,
      loginL2,
      deposit,
      disconnect,
      reset,
    };
  };
}
