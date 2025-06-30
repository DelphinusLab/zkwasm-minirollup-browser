import {
  InterfaceAbi,
  AbstractProvider,
  WebSocketProvider,
  JsonRpcProvider,
  AbstractSigner,
  Eip1193Provider,
  BrowserProvider,
  JsonRpcSigner,
  Wallet,
  TransactionRequest,
} from "ethers";

import { DelphinusContract } from "../contracts/client";
// RainbowKit related imports
import { createConfig } from 'wagmi';
import { connect, getAccount } from 'wagmi/actions';



// Unified DelphinusProvider interface
export interface DelphinusProvider {
  // Basic connection methods
  connect(): Promise<string>;
  close(): void;
  
  // Network related
  getNetworkId(): Promise<bigint>;
  switchNet(chainHexId: string): Promise<void>;
  
  // Signing related
  sign(message: string): Promise<string>;
  getJsonRpcSigner(): Promise<JsonRpcSigner>;
  
  // Contract related
  getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi): DelphinusContract;
  
  // Event subscription
  subscribeEvent<T>(eventName: string, cb: (event: T) => unknown): void;
  onAccountChange<T>(cb: (account: string) => T): void;
}

// Provider configuration interface
export interface ProviderConfig {
  type: 'browser' | 'rainbow' | 'readonly' | 'wallet';
  providerUrl?: string;
  privateKey?: string;
  chainId?: number;
}

// Global Provider manager
class ProviderManager {
  private static instance: ProviderManager;
  private currentProvider: DelphinusProvider | null = null;
  private providerConfig: ProviderConfig | null = null;

  private constructor() {}

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  // Set Provider configuration
  setProviderConfig(config: ProviderConfig) {
    this.providerConfig = config;
    this.currentProvider = null; // Clear current provider, recreate on next get
  }

  // Get current Provider
  async getProvider(): Promise<DelphinusProvider> {
    if (!this.providerConfig) {
      throw new Error("Provider config not set. Please call setProviderConfig first.");
    }

    if (!this.currentProvider) {
      this.currentProvider = await this.createProvider(this.providerConfig);
    }

    return this.currentProvider;
  }

  // Create Provider instance
  private async createProvider(config: ProviderConfig): Promise<DelphinusProvider> {
    switch (config.type) {
      case 'browser':
        return new DelphinusBrowserConnector();
      case 'rainbow':
        return new DelphinusRainbowConnector();
      case 'readonly':
        if (!config.providerUrl) {
          throw new Error("Provider URL is required for readonly provider");
        }
        return new DelphinusReadOnlyConnector(config.providerUrl);
      case 'wallet':
        if (!config.providerUrl || !config.privateKey) {
          throw new Error("Provider URL and private key are required for wallet provider");
        }
        const baseProvider = GetBaseProvider(config.providerUrl);
        return new DelphinusWalletConnector(config.privateKey, baseProvider);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  // Clear current Provider
  clearProvider() {
    if (this.currentProvider) {
      this.currentProvider.close();
      this.currentProvider = null;
    }
    this.providerConfig = null;
  }

      // Only clear provider instance, keep configuration
  clearProviderInstance() {
    if (this.currentProvider) {
      this.currentProvider.close();
      this.currentProvider = null;
    }
    // Keep providerConfig so it can be recreated on next getProvider call
  }
}

// Global function to get Provider
export async function getProvider(): Promise<DelphinusProvider> {
  return await ProviderManager.getInstance().getProvider();
}

// Function to set Provider configuration
export function setProviderConfig(config: ProviderConfig) {
  ProviderManager.getInstance().setProviderConfig(config);
}

// Function to clear Provider
export function clearProvider() {
  ProviderManager.getInstance().clearProvider();
}

// Only clear Provider instance, keep configuration
export function clearProviderInstance() {
  ProviderManager.getInstance().clearProviderInstance();
}

// Generic withProvider function
export async function withProvider<T>(
  callback: (provider: DelphinusProvider) => Promise<T>
): Promise<T> {
  const provider = await getProvider();
  try {
    return await callback(provider);
  } catch (error) {
    throw error;
  }
}

// Abstract base class providing common Provider functionality
export abstract class DelphinusBaseProvider<T extends AbstractProvider> implements DelphinusProvider {
  readonly provider: T;
  
  constructor(provider: T) {
    this.provider = provider;
  }

  // Basic method implementations
  async subscribeEvent<T>(eventName: string, cb: (event: T) => unknown) {
    return this.provider.on(eventName, cb);
  }

  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi) {
    return new DelphinusContract(contractAddress, abi, this.provider);
  }

  // Abstract methods, must be implemented by subclasses
  abstract connect(): Promise<string>;
  abstract close(): void;
  abstract getNetworkId(): Promise<bigint>;
  abstract switchNet(chainHexId: string): Promise<void>;
  abstract sign(message: string): Promise<string>;
  abstract getJsonRpcSigner(): Promise<JsonRpcSigner>;
  abstract getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  abstract onAccountChange<T>(cb: (account: string) => T): void;
}

// Abstract signer base class
export abstract class DelphinusBaseSigner<T extends AbstractSigner> implements DelphinusProvider {
  readonly signer: T;
  
  constructor(signer: T) {
    this.signer = signer;
  }

  get provider() {
    return this.signer.provider;
  }

  async subscribeEvent<T>(eventName: string, cb: (event: T) => unknown) {
    return this.provider?.on(eventName, cb);
  }

  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi): DelphinusContract {
    if (!this.provider) {
      throw new Error("Provider not available");
    }
    return new DelphinusContract(contractAddress, abi, this.provider);
  }

  // Abstract methods, must be implemented by subclasses
  abstract connect(): Promise<string>;
  abstract close(): void;
  abstract getNetworkId(): Promise<bigint>;
  abstract switchNet(chainHexId: string): Promise<void>;
  abstract sign(message: string): Promise<string>;
  abstract getJsonRpcSigner(): Promise<JsonRpcSigner>;
  abstract getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  abstract onAccountChange<T>(cb: (account: string) => T): void;
}

// DelphinusBaseProvider type alias
export type DelphinusBaseProviderType = WebSocketProvider | JsonRpcProvider;

// Helper function to get base Provider
export function GetBaseProvider(providerUrl: string) {
  if (providerUrl.startsWith("ws")) {
    return new WebSocketProvider(providerUrl);
  } else {
    return new JsonRpcProvider(providerUrl);
  }
}


// Browser Provider implementation (MetaMask etc.)
export class DelphinusBrowserConnector extends DelphinusBaseProvider<BrowserProvider> {
  constructor() {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed, Browser mode is not available.");
    }
    super(new BrowserProvider(window.ethereum, "any"));
  }

  async connect(): Promise<string> {
    // First request account access permission
    await this.provider.send("eth_requestAccounts", []);
    const signer = await this.provider.getSigner();
    return await signer.getAddress();
  }

  close() {
    // Note: Don't destroy provider as it may be used elsewhere
    // this.provider.destroy();
    // Just mark as closed state
  }

  async onAccountChange<T>(cb: (account: string) => T) {
    this.subscribeEvent("accountsChanged", cb);
  }

  async getNetworkId(): Promise<bigint> {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    return await this.provider.getSigner();
  }

  async getContractWithSigner(
    contractAddress: string,
    abi: InterfaceAbi
  ): Promise<DelphinusContract> {
    const signer = await this.getJsonRpcSigner();
    return new DelphinusContract(contractAddress, abi, signer);
  }

  async switchNet(chainHexId: string) {
    const currentId = await this.getNetworkId();
    const currentIdHex = "0x" + currentId.toString(16);
    
    if (currentIdHex !== chainHexId) {
      try {
        await this.provider.send("wallet_switchEthereumChain", [
          { chainId: chainHexId },
        ]);
      } catch (e) {
        throw e;
      }
    }
  }

  async sign(message: string): Promise<string> {
    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }
}

// 全局配置管理器 - 避免重复初始化
class WagmiConfigManager {
  private static instance: WagmiConfigManager;
  private config: ReturnType<typeof createConfig> | null = null;

  private constructor() {}

  static getInstance(): WagmiConfigManager {
    if (!WagmiConfigManager.instance) {
      WagmiConfigManager.instance = new WagmiConfigManager();
    }
    return WagmiConfigManager.instance;
  }

  // 获取全局共享的 wagmi 配置
  getSharedConfig(): ReturnType<typeof createConfig> | null {
    return this.config;
  }

  // 设置全局共享的 wagmi 配置
  setSharedConfig(config: ReturnType<typeof createConfig>) {
    if (!this.config) {
      this.config = config;

          }
  }

  // 检查是否已有配置
  hasConfig(): boolean {
    return this.config !== null;
  }

  // 清除配置（用于重置）
  clearConfig() {
    this.config = null;
  }
}

// 获取共享的 wagmi 配置，如果没有则返回 null
function getSharedWagmiConfig(): ReturnType<typeof createConfig> | null {
  return WagmiConfigManager.getInstance().getSharedConfig();
}

// 设置共享的 wagmi 配置
function setSharedWagmiConfig(config: ReturnType<typeof createConfig>) {
  WagmiConfigManager.getInstance().setSharedConfig(config);
}

// 导出配置管理器相关函数
export { getSharedWagmiConfig, setSharedWagmiConfig, WagmiConfigManager };

// RainbowKit Provider implementation
export class DelphinusRainbowConnector extends DelphinusBaseProvider<BrowserProvider> {
  private signer: JsonRpcSigner | null = null;
  private account: string | null = null;
  private chainId: number | null = null;
  private config: ReturnType<typeof createConfig> | null = null;

  constructor() {
    // 临时使用window.ethereum创建初始provider，但会在initialize时重新创建正确的provider
    if (!window.ethereum) {
      throw new Error("No ethereum provider found");
    }
    super(new BrowserProvider(window.ethereum, "any"));
    this.config = getSharedWagmiConfig();
  }

  // 从wagmi connector获取正确的provider
  private async getCorrectProvider(): Promise<BrowserProvider> {
    if (!this.config) {
      throw new Error("No wagmi config available");
    }

    try {
      const account = getAccount(this.config);
      
      if (account.connector) {
        const provider = await account.connector.getProvider();
        
        if (provider) {
          return new BrowserProvider(provider as Eip1193Provider, "any");
        }
      }
    } catch (error) {
      console.warn('Failed to get provider from wagmi connector:', error);
    }

    // 如果无法从connector获取provider，回退到window.ethereum
    return new BrowserProvider(window.ethereum, "any");
  }

  // Initialization method, needs to get data from RainbowKit hooks
  async initialize(account: `0x${string}` | undefined, chainId: number) {
    if (!account) {
      throw new Error("No account connected");
    }

    // Ensure we have wagmi config
    if (!this.config) {
      this.config = getSharedWagmiConfig();
      if (!this.config) {
        throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
      }
    }

    // 重新创建正确的provider
    try {
      const correctProvider = await this.getCorrectProvider();
      (this as any).provider = correctProvider;
    } catch (error) {
      console.warn('Failed to get correct provider, using existing provider:', error);
    }

    // 更新内部状态
    this.account = account;
    this.chainId = chainId;
    
    // 获取当前活跃的signer
    try {
      this.signer = await this.provider.getSigner();
      
      // 验证signer的地址是否与期望地址匹配
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        console.warn('Signer address mismatch:', {
          signerAddress,
          expectedAddress: account
        });
      }
    } catch (error) {
      console.error('Failed to get signer during initialization:', error);
      
      // 重试一次
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.signer = await this.provider.getSigner();
      } catch (retryError) {
        console.error('Failed to get signer on retry:', retryError);
        console.warn('Signer initialization failed, will retry when needed');
      }
    }
  }

    // Create genuine RainbowKit style connection modal
  private async connectWithRainbowKit(): Promise<string> {
    try {
      // 获取共享的配置，如果没有则抛出错误
      if (!this.config) {
        this.config = getSharedWagmiConfig();
        if (!this.config) {
          throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
        }
      }
      
      // Store config in local variable for TypeScript
      const config = this.config;
      
      // Get available connectors
      const connectors = config.connectors;
      
      return new Promise((resolve, reject) => {
        // Create RainbowKit style modal
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999999;
          backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease-out;
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .wallet-button:hover {
            background: #f1f5f9 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          }
        `;
        document.head.appendChild(style);

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 360px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        `;

        // Top close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
          position: absolute;
          top: 16px;
          right: 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          color: #6b7280;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        `;
        closeBtn.onmouseenter = () => {
          closeBtn.style.background = '#e5e7eb';
          closeBtn.style.color = '#374151';
        };
        closeBtn.onmouseleave = () => {
          closeBtn.style.background = '#f3f4f6';
          closeBtn.style.color = '#6b7280';
        };

        const title = document.createElement('h1');
        title.textContent = 'Connect a wallet';
        title.style.cssText = `
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          text-align: center;
        `;

        const walletContainer = document.createElement('div');
        walletContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 8px;
        `;

        // Wallet icon mapping
        const walletIcons = {
          'MetaMask': `<svg width="24" height="24" viewBox="0 0 318.6 318.6" fill="none"><path d="m274.1 35.5-99.5 73.9L193 65.8z" fill="#e2761b"/><path d="m44.4 35.5 98.7 74.6-17.5-44.3z" fill="#e4761b"/><path d="m238.3 206.8-26.5 40.6 56.7 15.6 16.3-55.3z" fill="#e4761b"/><path d="m33.9 207.7 16.2 55.3 56.7-15.6-26.5-40.6z" fill="#e4761b"/></svg>`,
          'WalletConnect': `<svg width="24" height="24" viewBox="0 0 300 185" fill="#3b99fc"><path d="M61.4385 36.2562C109.367 -9.42187 190.633 -9.42187 238.562 36.2562L244.448 41.6729C246.893 43.9396 246.893 47.7604 244.448 50.0271L224.408 68.9729C223.185 70.1062 221.174 70.1062 219.951 68.9729L211.107 60.8187C179.577 30.5771 120.423 30.5771 88.8926 60.8187L79.2963 69.8729C78.0741 71.0062 76.0630 71.0062 74.8407 69.8729L54.8007 50.9271C52.3556 48.6604 52.3556 44.8396 54.8007 42.5729L61.4385 36.2562Z"/></svg>`,
          'Coinbase Wallet': `<svg width="24" height="24" viewBox="0 0 1024 1024" fill="#0052ff"><path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 692c-99.4 0-180-80.6-180-180s80.6-180 180-180 180 80.6 180 180-80.6 180-180 180z"/></svg>`
        };

        // Create button for each connector
        connectors.forEach((connector) => {
          const btn = document.createElement('button');
          const iconHtml = walletIcons[connector.name as keyof typeof walletIcons] || 
            `<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${connector.name.substring(0, 2).toUpperCase()}</div>`;
          
          btn.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${iconHtml}
                <span style="font-size: 16px; font-weight: 500; color: #111827;">${connector.name}</span>
              </div>
              <div style="width: 12px; height: 12px; border: 2px solid #d1d5db; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; display: none;" class="loading"></div>
            </div>
          `;
          btn.className = 'wallet-button';
          btn.style.cssText = `
            width: 100%;
            padding: 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
            position: relative;
          `;

          const loadingStyle = document.createElement('style');
          loadingStyle.textContent = `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(loadingStyle);

          btn.onclick = async () => {
            // Show loading state
            const loading = btn.querySelector('.loading') as HTMLElement;
            if (loading) loading.style.display = 'block';
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            
            try {
              // Use wagmi to connect
              const result = await connect(config, { connector });
              
              if (result.accounts && result.accounts.length > 0) {
                this.account = result.accounts[0];
                this.chainId = result.chainId;
                this.signer = await this.provider.getSigner(result.accounts[0]);
                
                // Cleanup
                document.body.removeChild(modalOverlay);
                document.head.removeChild(style);
                document.head.removeChild(loadingStyle);
                
                resolve(result.accounts[0]);
              }
            } catch (error) {
              // Restore button state
              if (loading) loading.style.display = 'none';
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              
              // If not user cancellation, show error
              if (error instanceof Error && !error.message.includes('User rejected')) {
                console.error('Connection failed:', error);
                // Can show error message here
              }
            }
          };

          walletContainer.appendChild(btn);
        });

        // Bottom info
        const footer = document.createElement('div');
        footer.style.cssText = `
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
          text-align: center;
        `;

        const footerText = document.createElement('p');
        footerText.innerHTML = `
          <span style="color: #6b7280; font-size: 14px;">New to Ethereum wallets? </span>
          <a href="#" style="color: #3b82f6; font-size: 14px; text-decoration: none; font-weight: 500;">Learn more</a>
        `;
        footerText.style.margin = '0';

        // Event handling
        closeBtn.onclick = () => {
          document.body.removeChild(modalOverlay);
          document.head.removeChild(style);
          reject(new Error('User cancelled connection'));
        };

        modalOverlay.onclick = (e) => {
          if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
            document.head.removeChild(style);
            reject(new Error('User cancelled connection'));
          }
        };

        // Assemble modal
        modalContent.style.position = 'relative';
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(walletContainer);
        footer.appendChild(footerText);
        modalContent.appendChild(footer);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
      });
    } catch (error) {
      throw new Error(`Failed to connect: ${error}`);
    }
  }

  async connect(): Promise<string> {
    // If already initialized, return account directly
    if (this.account) {
      return this.account;
    }

    // Ensure we have wagmi config before attempting connection
    if (!this.config) {
      this.config = getSharedWagmiConfig();
      if (!this.config) {
        throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
      }
    }

    // Check if already connected using wagmi instead of direct provider calls
    try {
      const account = getAccount(this.config);
      if (account.address && account.chainId) {
        this.account = account.address;
        this.chainId = account.chainId;
        this.signer = await this.provider.getSigner(account.address);
        return account.address;
      }
    } catch (error) {
      // No existing connection found, proceed with manual connection
      console.log('No existing wagmi connection found, proceeding with manual connection');
    }

    // Fallback: check browser provider directly
    try {
      const accounts = await this.provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        const chainId = await this.provider.send("eth_chainId", []);
        this.account = accounts[0];
        this.chainId = parseInt(chainId, 16);
        this.signer = await this.provider.getSigner(accounts[0]);
        return accounts[0];
      }
    } catch (error) {
      // No existing connection found via direct provider call
      console.log('No existing provider connection found, showing connection modal');
    }

    // Show connection modal
    return await this.connectWithRainbowKit();
  }

  close() {
    // Note: Don't destroy provider as it may be used elsewhere
    // this.provider.destroy();
    this.signer = null;
    this.account = null;
    this.chainId = null;
  }

  async onAccountChange<T>(cb: (account: string) => T) {
    // This functionality will be handled by wagmi's useAccount hook
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
      
      if (error.code === 'NETWORK_ERROR' && error.message.includes('network changed')) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const network = await this.provider.getNetwork();
          return network.chainId;
        } catch (retryError) {
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    // 如果signer未初始化，尝试重新获取signer
    if (!this.signer) {
      try {
        // 确保使用正确的provider
        const correctProvider = await this.getCorrectProvider();
        (this as any).provider = correctProvider;
        
        this.signer = await this.provider.getSigner();
      } catch (error) {
        console.error('Failed to get current signer:', error);
        throw new Error(`Failed to initialize signer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

  async switchNet(chainHexId: string) {
    const chainId = parseInt(chainHexId, 16);
    const currentId = await this.getNetworkId();
    
    if (currentId.toString() !== chainId.toString()) {
      try {
        await this.provider.send("wallet_switchEthereumChain", [
          { chainId: chainHexId },
        ]);
        
        // Update internal state
        this.chainId = chainId;
        if (this.account) {
          // Re-get signer to ensure it uses the new network
          this.signer = await this.provider.getSigner(this.account);
        }
      } catch (e) {
        console.error('Failed to switch network:', e);
        throw e;
      }
    }
  }

  async sign(message: string): Promise<string> {
    // 如果signer未初始化，尝试重新获取signer
    if (!this.signer) {
      try {
        // 确保使用正确的provider
        const correctProvider = await this.getCorrectProvider();
        (this as any).provider = correctProvider;
        
        this.signer = await this.provider.getSigner();
      } catch (error) {
        console.error('Failed to get current signer:', error);
        throw new Error(`Failed to initialize signer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Signature failed:', error);
      throw error;
    }
  }
}

// Read-only Provider implementation (non-browser environment, no private key)
export class DelphinusReadOnlyConnector extends DelphinusBaseProvider<DelphinusBaseProviderType> {
  constructor(providerUrl: string) {
    super(GetBaseProvider(providerUrl));
  }

  async connect(): Promise<string> {
    throw new Error("Read-only provider cannot connect to wallet");
  }

  close() {
    // Read-only provider doesn't need special cleanup
  }

  async onAccountChange<T>(cb: (account: string) => T) {
    throw new Error("Read-only provider does not support account changes");
  }

  async getNetworkId(): Promise<bigint> {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    throw new Error("Read-only provider does not support signing");
  }

  async getContractWithSigner(
    contractAddress: string,
    abi: InterfaceAbi
  ): Promise<DelphinusContract> {
    throw new Error("Read-only provider does not support signing contracts");
  }

  async switchNet(chainHexId: string) {
    throw new Error("Read-only provider cannot switch networks");
  }

  async sign(message: string): Promise<string> {
    throw new Error("Read-only provider does not support signing");
  }
}

// Wallet Provider implementation (non-browser environment, with private key)
export class DelphinusWalletConnector extends DelphinusBaseSigner<Wallet> {
  constructor(privateKey: string, provider: DelphinusBaseProviderType) {
    super(new Wallet(privateKey, provider));
  }

  async connect(): Promise<string> {
    return await this.signer.getAddress();
  }

  close() {
    // Wallet provider doesn't need special cleanup
  }

  async onAccountChange<T>(cb: (account: string) => T) {
    throw new Error("Wallet provider does not support account changes");
  }

  async getNetworkId(): Promise<bigint> {
    if (!this.provider) {
      throw new Error("Provider not available");
    }
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    return this.signer as unknown as JsonRpcSigner;
  }

  async switchNet(chainHexId: string) {
    throw new Error("Wallet provider cannot switch networks");
  }

  async sign(message: string): Promise<string> {
    return await this.signer.signMessage(message);
  }

  async getContractWithSigner(
    contractAddress: string,
    abi: InterfaceAbi
  ): Promise<DelphinusContract> {
    return new DelphinusContract(contractAddress, abi, this.signer);
  }

  // Simulate calling contract method
  async call(req: TransactionRequest) {
    return await this.signer.call(req);
  }
}
