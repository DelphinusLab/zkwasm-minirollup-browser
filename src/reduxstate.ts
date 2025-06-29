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

// Serializable L2 account info interface
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



async function loginL2Account(address: string): Promise<L2AccountInfo> {
  const str:string = await signMessage(address);
  console.log("signed result", str);
  return new L2AccountInfo(str.substring(0,34));
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

export interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: L2AccountInfo;  // Restore using L2AccountInfo
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
    return l2account;  // Return L2AccountInfo instance directly
  }
);

export const depositAsync = createAsyncThunk(
  'acccount/deposit',
  async (params: {tokenIndex: number, amount: number, l2account: L2AccountInfo, l1account: L1AccountInfo} ,  thunkApi) => {
    const txReceipt = await deposit(getChainId(), params.tokenIndex, params.amount, params.l2account, params.l1account);
    
    if (!txReceipt) {
      throw new Error('Transaction failed: no receipt received');
    }
    
    // Return only serializable transaction information
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



// Complete wallet connection and L1 login flow
export const connectWalletAndLoginL1Async = createAsyncThunk(
  'account/connectAndLoginL1',
  async (_, thunkApi) => {
    // This function needs to be called from React component because it requires hooks
    throw new Error('This function should be called from a React component with RainbowKit hooks');
  }
);

// Connection function for external use, requires RainbowKit hooks
export const connectWalletAndLoginL1WithHooksAsync = createAsyncThunk(
  'account/connectAndLoginL1WithHooks',
  async (rainbowKitHooks: {
    isConnected: boolean;
    address?: string;
    chainId?: number;
    openConnectModal?: () => void;
    connect?: (config: any) => void;  // wagmi connect returns void
    connectors?: readonly any[];      // wagmi connectors are readonly
    signMessageAsync: (config: any) => Promise<string>;
    switchChain: (config: any) => void;  // wagmi switchChain returns void
  }, thunkApi) => {
    // If wallet is not connected, try to connect first
    if (!rainbowKitHooks.isConnected || !rainbowKitHooks.address) {
      console.log('Wallet not connected, attempting to connect...');
      
      // Prefer using openConnectModal
      if (rainbowKitHooks.openConnectModal) {
        console.log('Opening RainbowKit connect modal...');
        rainbowKitHooks.openConnectModal();
        throw new Error('Please connect your wallet using the modal');
      }
      
      // Fallback: try to auto-connect first connector
      if (rainbowKitHooks.connect && rainbowKitHooks.connectors && rainbowKitHooks.connectors.length > 0) {
        try {
          console.log('Attempting auto-connect with first connector...');
          rainbowKitHooks.connect({ connector: rainbowKitHooks.connectors[0] });
          // Connection is async but function returns immediately, so we wait for connection state update
          throw new Error('Wallet connection initiated. Please wait for connection to complete and try again.');
        } catch (connectError) {
          console.error('Auto-connect failed:', connectError);
          throw new Error('Failed to connect wallet automatically. Please connect manually.');
        }
      } else {
        throw new Error('No wallet connection method available. Please ensure RainbowKit is properly configured.');
      }
    }
    
    // Wallet connected, proceed with L1 login
    console.log('Wallet connected, proceeding with L1 login...');
    const account = await loginL1Account();
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
      // Complete connection and login flow
      .addCase(connectWalletAndLoginL1WithHooksAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // Should be Ready state after successful L1 login
        state.l1Account = c.payload;
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })

  },
});

// Convenience type definition for external projects
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

// Convenience function: create RainbowKit hooks object
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

// SDK React Hook - using new Provider pattern
export function useZkWasmWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  // Check wallet connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check ethereum object directly without going through provider
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
          // If accounts exist, get network info
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
            // Even if accounts exist, set as disconnected if provider has issues
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
        // Provider unavailable or not connected
        console.warn('Connection check error:', error);
        setIsConnected(false);
        setAddress(undefined);
        setChainId(undefined);
      }
    };

    checkConnection();

    // Listen for account changes
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
      // First check if RainbowKit provider needs initialization
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      
      // If rainbow type, need to get account info first for initialization
      let currentProvider;
      try {
        currentProvider = await getProvider();
      } catch (error) {
        // Provider not yet created, this is normal
        console.log('Provider not yet created, will create after wallet connection');
      }
      
      // If RainbowKit provider but not initialized, need to connect wallet first to get info
      if (currentProvider instanceof DelphinusRainbowConnector) {
        // Check if already initialized
        try {
          await currentProvider.connect();
        } catch (error) {
          // Not initialized, need to get account info first
          console.log('RainbowKit provider needs initialization');
          
          // Get account info directly from MetaMask
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            const accounts = await (window as any).ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            const chainId = await (window as any).ethereum.request({ 
              method: 'eth_chainId' 
            });
            
            if (accounts.length > 0) {
              // Initialize RainbowKit provider
              await currentProvider.initialize(accounts[0], parseInt(chainId, 16));
            }
          }
        }
      }
      
      const result = await withProvider(async (provider) => {
        // Connect wallet
        const connectedAddress = await provider.connect();
        const networkId = await provider.getNetworkId();
        
        // Update state
        setIsConnected(true);
        setAddress(connectedAddress);
        setChainId(Number(networkId));
        
        // Execute L1 login
        const l1Account: L1AccountInfo = {
          address: connectedAddress,
          chainId: networkId.toString()
        };
        
        return l1Account;
      });
      
      // Update Redux state
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
      // Ensure RainbowKit provider is initialized
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      const currentProvider = await getProvider();
      
      if (currentProvider instanceof DelphinusRainbowConnector && address && chainId) {
        try {
          await currentProvider.connect();
        } catch (error) {
          // If connection fails, reinitialize
          console.log('Re-initializing RainbowKit provider for L2 login');
          await currentProvider.initialize(address as `0x${string}`, chainId);
        }
      }
      
      const result = await withProvider(async (provider) => {
        // Use provider to sign - note: should sign appName, not address
        const signature = await provider.sign(appName);
        console.log("signed result (new provider pattern)", signature);
        
        // Create L2 account - use first 34 characters of signature (including 0x prefix)
        const l2Account = new L2AccountInfo(signature.substring(0, 34));
        return l2Account;
      });
      
      // Update Redux state
      dispatch(loginL2AccountAsync.fulfilled(result, '', appName));
      return result;
    } catch (error) {
      console.error('L2 login failed:', error);
      dispatch(loginL2AccountAsync.rejected(error as any, '', appName));
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
      dispatch(depositAsync.pending('', params));
      
      // Ensure RainbowKit provider is initialized
      const { getProvider, DelphinusRainbowConnector } = await import('./provider');
      const currentProvider = await getProvider();
      
      if (currentProvider instanceof DelphinusRainbowConnector && address && chainId) {
        try {
          await currentProvider.connect();
        } catch (error) {
          // If connection fails, reinitialize
          console.log('Re-initializing RainbowKit provider for deposit');
          await currentProvider.initialize(address as `0x${string}`, chainId);
        }
      }
      
      const result = await withProvider(async (provider) => {
        // Ensure network is correct
        const targetChainId = getChainId();
        const chainidhex = "0x" + targetChainId.toString(16);
        await provider.switchNet(chainidhex);
        
        // Calculate PID array
        const pubkey = params.l2account.pubkey;
        const leHexBN = new LeHexBN(bnToHexLe(pubkey));
        const pkeyArray = leHexBN.toU64Array();
        
        // Get contract addresses
        const envConfig = getEnvConfig();
        const proxyAddr = envConfig.depositContract;
        const tokenAddr = envConfig.tokenContract;
        
        console.log('Deposit: contract addresses', { proxyAddr, tokenAddr });
        
        if (!proxyAddr || !tokenAddr) {
          throw new Error("Deposit contract or token contract address not configured");
        }
        
        // Get contract instances
        const tokenContract = await provider.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
        const tokenContractReader = provider.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
        
        // Check balance and allowance
        const balance = await tokenContractReader.getEthersContract().balanceOf(params.l1account.address);
        const allowance = await tokenContractReader.getEthersContract().allowance(params.l1account.address, proxyAddr);
        
        console.log("Deposit: token balance:", balance.toString());
        console.log("Deposit: allowance:", allowance.toString());
        
        // Calculate amount (convert to wei)
        let a = new BN(params.amount);
        let b = new BN("10").pow(new BN(18));
        const amountWei = a.mul(b);
        
        console.log("Deposit: amount in wei:", amountWei.toString());
        
        // If authorization insufficient, authorize first
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
        
        // Execute deposit transaction
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
        
        // Return transaction receipt in expected format
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
      // Only clear provider instance but keep configuration for reconnection
      const { clearProviderInstance } = await import('./provider');
      clearProviderInstance();
      
      // If browser environment, prompt user
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('Provider disconnected. To fully disconnect, please disconnect from MetaMask manually.');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      // Clear local state
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
    // State
    isConnected,
    address,
    chainId,
    
    // Actions
    connectAndLoginL1,
    loginL2,
    deposit,
    disconnect,
    reset,
  };
}

// Convenience function: initialize SDK Hook, external projects call once
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
      return dispatch(loginL2AccountAsync(appName));
    };

    const deposit = (dispatch: any, params: {
      tokenIndex: number;
      amount: number;
      l2account: L2AccountInfo;
      l1account: L1AccountInfo;
    }) => {
      return dispatch(depositAsync(params));
    };

    const reset = (dispatch: any) => {
      disconnect();
      dispatch(resetAccountState());
    };

    return {
      // State
      isConnected,
      address,
      chainId,
      
      // Actions
      connectAndLoginL1,
      loginL2,
      deposit,
      disconnect,
      reset,
    };
  };
}
