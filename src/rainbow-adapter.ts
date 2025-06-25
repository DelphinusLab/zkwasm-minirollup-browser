import { useConnectModal } from '@rainbow-me/rainbowkit';
import { BrowserProvider, InterfaceAbi, JsonRpcSigner } from 'ethers';
import { useAccount, useChainId, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { DelphinusContract } from './client.js';

// RainbowKit 适配器类，兼容现有的 DelphinusBrowserConnector 接口
export class RainbowKitAdapter {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;

  constructor() {
    // 在构造函数中不做初始化，因为需要在 React 组件中使用 hooks
  }

  // 初始化方法，需要传入从 wagmi hooks 获取的数据
  async initialize(account: `0x${string}` | undefined, chainId: number) {
    if (!account) {
      throw new Error("No account connected");
    }

    // 使用 window.ethereum 创建 ethers provider
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum, chainId);
      
      // 验证当前网络是否与期望的链 ID 匹配
      try {
        const network = await this.provider.getNetwork();
        const currentChainId = network.chainId;
        
        // 只在不匹配时输出警告
        if (currentChainId.toString() !== chainId.toString()) {
          console.warn(`Chain ID mismatch during initialization: expected ${chainId}, got ${currentChainId.toString()}`);
          // 重新创建 provider 以确保使用正确的网络
          this.provider = new BrowserProvider(window.ethereum, Number(currentChainId));
        }
      } catch (networkError) {
        console.warn('Failed to verify network during initialization:', networkError);
        // 如果网络验证失败，继续使用传入的 chainId
      }
      
      this.signer = await this.provider.getSigner(account);
    } else {
      throw new Error("No ethereum provider found");
    }
  }

  async connect(): Promise<string> {
    if (!this.signer) {
      throw new Error("Adapter not initialized");
    }
    return await this.signer.getAddress();
  }

  close() {
    this.provider?.destroy();
    this.provider = null;
    this.signer = null;
  }

  async onAccountChange<T>(cb: (account: string) => T) {
    // 这个功能将通过 wagmi 的 useAccount hook 处理
    console.log("Account change handling moved to wagmi useAccount hook");
  }

  async getNetworkId(): Promise<bigint> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }
    
    try {
      const network = await this.provider.getNetwork();
      return network.chainId;
    } catch (error: any) {
      console.error('Failed to get network ID:', error);
      
      // 如果是网络变更错误，尝试重新获取网络信息
      if (error.code === 'NETWORK_ERROR' && error.message.includes('network changed')) {
        console.log('Network changed detected, retrying...');
        try {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
          const network = await this.provider.getNetwork();
          return network.chainId;
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    if (!this.signer) {
      throw new Error("Signer not initialized");
    }
    return this.signer;
  }

  async getContractWithSigner(
    contractAddress: string,
    abi: InterfaceAbi
  ): Promise<DelphinusContract> {
    const signer = await this.getJsonRpcSigner();
    return new DelphinusContract(contractAddress, abi, signer);
  }

  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi) {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }
    return new DelphinusContract(contractAddress, abi, this.provider);
  }

  async switchNet(chainHexId: string) {
    // 这个功能将通过 wagmi 的 useSwitchChain hook 处理
    const chainId = parseInt(chainHexId, 16);
    throw new Error(`Use useSwitchChain hook to switch to chain ${chainId}`);
  }

  async sign(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer not initialized");
    }
    return await this.signer.signMessage(message);
  }

  // 工具方法：获取当前提供者
  getProvider(): BrowserProvider | null {
    return this.provider;
  }
}

// React Hook：用于获取 RainbowKit 适配器实例
export function useRainbowKitAdapter() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();

  const adapter = new RainbowKitAdapter();

  // 初始化适配器
  const initializeAdapter = async () => {
    if (isConnected && address) {
      await adapter.initialize(address, chainId);
      return adapter;
    }
    throw new Error("Wallet not connected");
  };

  return {
    adapter,
    initializeAdapter,
    address,
    isConnected,
    chainId,
    openConnectModal,
    disconnect,
    switchChain,
    signMessageAsync,
    isSigningMessage,
  };
}

// 兼容性函数：模拟原有的 withBrowserConnector 函数
export async function withRainbowKitConnector<T>(
  cb: (adapter: RainbowKitAdapter) => Promise<T>,
  rainbowKitHooks: any
): Promise<T> {
  try {
    const adapter = new RainbowKitAdapter();
    
    // 使用传入的参数初始化适配器
    if (rainbowKitHooks.isConnected && rainbowKitHooks.address) {
      await adapter.initialize(rainbowKitHooks.address, rainbowKitHooks.chainId);
      
      // 执行回调函数，如果需要重新初始化适配器，会在回调函数中处理
      return await cb(adapter);
    } else {
      throw new Error("Wallet not connected");
    }
  } catch (e) {
    throw e;
  }
}

// 添加一个方法来重新初始化适配器
export async function reinitializeAdapter(adapter: RainbowKitAdapter, address: string, chainId: number) {
  // 清理旧的连接
  adapter.close();
  
  // 重新初始化
  await adapter.initialize(address as `0x${string}`, chainId);
} 