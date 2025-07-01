import { RainbowKitHooks, L1AccountInfo } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';
import { 
  connectWalletAndLoginL1WithHooksAsync, 
  loginL2AccountAsync, 
  depositAsync, 
  resetAccountState 
} from '../store';
import { DelphinusRainbowConnector, setProviderConfig, clearProvider } from '../providers/provider';

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

    const loginL2 = (dispatch: any, messageToSign: string) => {
      if (!messageToSign) {
        throw new Error('messageToSign is required for L2 login');
      }
      return dispatch(loginL2AccountAsync(messageToSign));
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

// ========================================
// 🌈 RAINBOW ADAPTER FUNCTIONS
// ========================================

// React Hook: Get RainbowKit adapter instance
export function useRainbowKitAdapter() {
  throw new Error(`
    useRainbowKitAdapter requires wagmi providers to be set up.
    
    Please use the Provider pattern instead:
    
    import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';
    
    setProviderConfig({ type: 'rainbow' });
    
    const result = await withProvider(async (provider) => {
      return await provider.connect();
    });
  `);
}

// Compatibility function: Simulate the original withRainbowKitConnector function
export async function withRainbowKitConnector<T>(
  cb: (provider: any) => Promise<T>,
  rainbowKitHooks: any
): Promise<T> {
  try {
    setProviderConfig({ type: 'rainbow' });
    
    const { getProvider } = await import('../providers/provider');
    const provider = await getProvider();
    
    if (provider instanceof DelphinusRainbowConnector && rainbowKitHooks.isConnected && rainbowKitHooks.address) {
      await provider.initialize(rainbowKitHooks.address, rainbowKitHooks.chainId);
    }
    
    return await cb(provider);
  } catch (e) {
    throw e;
  }
}

// Reinitialize adapter
export async function reinitializeRainbowProvider(address: string, chainId: number) {
  clearProvider();
  setProviderConfig({ type: 'rainbow' });
  
  const { getProvider } = await import('../providers/provider');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// Initialize Rainbow Provider
export async function initializeRainbowProvider(address: string, chainId: number) {
  setProviderConfig({ type: 'rainbow' });
  
  const { getProvider } = await import('../providers/provider');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// Cleanup Rainbow provider
export function cleanupRainbowProvider() {
  clearProvider();
} 