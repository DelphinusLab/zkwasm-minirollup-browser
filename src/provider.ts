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

import { DelphinusContract } from "./client.js";
import { getWalletConnectId } from './env-adapter';

// RainbowKit 相关导入
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { connect, disconnect, getAccount, getChainId, switchChain } from 'wagmi/actions';
import { mainnet, sepolia } from 'wagmi/chains';



// 统一的 DelphinusProvider 接口
export interface DelphinusProvider {
  // 基础连接方法
  connect(): Promise<string>;
  close(): void;
  
  // 网络相关
  getNetworkId(): Promise<bigint>;
  switchNet(chainHexId: string): Promise<void>;
  
  // 签名相关
  sign(message: string): Promise<string>;
  getJsonRpcSigner(): Promise<JsonRpcSigner>;
  
  // 合约相关
  getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi): DelphinusContract;
  
  // 事件订阅
  subscribeEvent<T>(eventName: string, cb: (event: T) => unknown): void;
  onAccountChange<T>(cb: (account: string) => T): void;
}

// Provider 配置接口
export interface ProviderConfig {
  type: 'browser' | 'rainbow' | 'readonly' | 'wallet';
  providerUrl?: string;
  privateKey?: string;
  chainId?: number;
}

// 全局 Provider 管理器
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

  // 设置 Provider 配置
  setProviderConfig(config: ProviderConfig) {
    this.providerConfig = config;
    this.currentProvider = null; // 清除当前 provider，下次获取时重新创建
  }

  // 获取当前 Provider
  async getProvider(): Promise<DelphinusProvider> {
    if (!this.providerConfig) {
      throw new Error("Provider config not set. Please call setProviderConfig first.");
    }

    if (!this.currentProvider) {
      this.currentProvider = await this.createProvider(this.providerConfig);
    }

    return this.currentProvider;
  }

  // 创建 Provider 实例
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

  // 清除当前 Provider
  clearProvider() {
    if (this.currentProvider) {
      this.currentProvider.close();
      this.currentProvider = null;
    }
    this.providerConfig = null;
  }

  // 只清理 provider 实例，保留配置
  clearProviderInstance() {
    if (this.currentProvider) {
      this.currentProvider.close();
      this.currentProvider = null;
    }
    // 保留 providerConfig，这样下次 getProvider 时可以重新创建
  }
}

// 全局获取 Provider 的函数
export async function getProvider(): Promise<DelphinusProvider> {
  return await ProviderManager.getInstance().getProvider();
}

// 设置 Provider 配置的函数
export function setProviderConfig(config: ProviderConfig) {
  ProviderManager.getInstance().setProviderConfig(config);
}

// 清除 Provider 的函数
export function clearProvider() {
  ProviderManager.getInstance().clearProvider();
}

// 只清除 Provider 实例，保留配置
export function clearProviderInstance() {
  ProviderManager.getInstance().clearProviderInstance();
}

// 通用的 withProvider 函数
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

// 抽象基类，提供通用的 Provider 功能
export abstract class DelphinusBaseProvider<T extends AbstractProvider> implements DelphinusProvider {
  readonly provider: T;
  
  constructor(provider: T) {
    this.provider = provider;
  }

  // 基础方法实现
  async subscribeEvent<T>(eventName: string, cb: (event: T) => unknown) {
    return this.provider.on(eventName, cb);
  }

  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi) {
    return new DelphinusContract(contractAddress, abi, this.provider);
  }

  // 抽象方法，子类必须实现
  abstract connect(): Promise<string>;
  abstract close(): void;
  abstract getNetworkId(): Promise<bigint>;
  abstract switchNet(chainHexId: string): Promise<void>;
  abstract sign(message: string): Promise<string>;
  abstract getJsonRpcSigner(): Promise<JsonRpcSigner>;
  abstract getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  abstract onAccountChange<T>(cb: (account: string) => T): void;
}

// 抽象签名者基类
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

  // 抽象方法，子类必须实现
  abstract connect(): Promise<string>;
  abstract close(): void;
  abstract getNetworkId(): Promise<bigint>;
  abstract switchNet(chainHexId: string): Promise<void>;
  abstract sign(message: string): Promise<string>;
  abstract getJsonRpcSigner(): Promise<JsonRpcSigner>;
  abstract getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  abstract onAccountChange<T>(cb: (account: string) => T): void;
}

// DelphinusBaseProvider 类型别名
export type DelphinusBaseProviderType = WebSocketProvider | JsonRpcProvider;

// 获取基础 Provider 的辅助函数
export function GetBaseProvider(providerUrl: string) {
  if (providerUrl.startsWith("ws")) {
    return new WebSocketProvider(providerUrl);
  } else {
    return new JsonRpcProvider(providerUrl);
  }
}

// 扩展 window 接口以识别 ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// 浏览器 Provider 实现（MetaMask 等）
export class DelphinusBrowserConnector extends DelphinusBaseProvider<BrowserProvider> {
  constructor() {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed, Browser mode is not available.");
    }
    super(new BrowserProvider(window.ethereum, "any"));
  }

  async connect(): Promise<string> {
    // 首先请求账户访问权限
    await this.provider.send("eth_requestAccounts", []);
    const signer = await this.provider.getSigner();
    return await signer.getAddress();
  }

  close() {
    // 注意：不要销毁 provider，因为它可能被其他地方使用
    // this.provider.destroy();
    // 只是标记为关闭状态
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

// Wagmi 配置
let wagmiConfig: ReturnType<typeof createConfig> | null = null;

function getWagmiConfig() {
  if (!wagmiConfig) {
    const connectors = connectorsForWallets(
      [
        {
          groupName: 'Recommended',
          wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
        },
      ],
      {
        appName: 'Delphinus zkWasm MiniRollup',
        projectId: getWalletConnectId() || 'YOUR_PROJECT_ID',
      }
    );

    wagmiConfig = createConfig({
      connectors,
      chains: [mainnet, sepolia],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
    });
  }
  return wagmiConfig;
}

// RainbowKit Provider 实现
export class DelphinusRainbowConnector extends DelphinusBaseProvider<BrowserProvider> {
  private signer: JsonRpcSigner | null = null;
  private account: string | null = null;
  private chainId: number | null = null;
  private config: ReturnType<typeof createConfig>;

  constructor() {
    if (!window.ethereum) {
      throw new Error("No ethereum provider found");
    }
    super(new BrowserProvider(window.ethereum, "any"));
    this.config = getWagmiConfig();
  }

  // 初始化方法，需要从 RainbowKit hooks 获取数据
  async initialize(account: `0x${string}` | undefined, chainId: number) {
    if (!account) {
      throw new Error("No account connected");
    }

    this.account = account;
    this.chainId = chainId;
    this.signer = await this.provider.getSigner(account);
  }

    // 创建真正的 RainbowKit 风格连接模态框
  private async connectWithRainbowKit(): Promise<string> {
    try {
      // 获取可用的连接器
      const connectors = this.config.connectors;
      
      return new Promise((resolve, reject) => {
        // 创建 RainbowKit 风格的模态框
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

        // 添加动画样式
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

        // 顶部关闭按钮
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

        // 钱包图标映射
        const walletIcons = {
          'MetaMask': `<svg width="24" height="24" viewBox="0 0 318.6 318.6" fill="none"><path d="m274.1 35.5-99.5 73.9L193 65.8z" fill="#e2761b"/><path d="m44.4 35.5 98.7 74.6-17.5-44.3z" fill="#e4761b"/><path d="m238.3 206.8-26.5 40.6 56.7 15.6 16.3-55.3z" fill="#e4761b"/><path d="m33.9 207.7 16.2 55.3 56.7-15.6-26.5-40.6z" fill="#e4761b"/></svg>`,
          'WalletConnect': `<svg width="24" height="24" viewBox="0 0 300 185" fill="#3b99fc"><path d="M61.4385 36.2562C109.367 -9.42187 190.633 -9.42187 238.562 36.2562L244.448 41.6729C246.893 43.9396 246.893 47.7604 244.448 50.0271L224.408 68.9729C223.185 70.1062 221.174 70.1062 219.951 68.9729L211.107 60.8187C179.577 30.5771 120.423 30.5771 88.8926 60.8187L79.2963 69.8729C78.0741 71.0062 76.0630 71.0062 74.8407 69.8729L54.8007 50.9271C52.3556 48.6604 52.3556 44.8396 54.8007 42.5729L61.4385 36.2562Z"/></svg>`,
          'Coinbase Wallet': `<svg width="24" height="24" viewBox="0 0 1024 1024" fill="#0052ff"><path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 692c-99.4 0-180-80.6-180-180s80.6-180 180-180 180 80.6 180 180-80.6 180-180 180z"/></svg>`
        };

        // 为每个连接器创建按钮
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
            // 显示加载状态
            const loading = btn.querySelector('.loading') as HTMLElement;
            if (loading) loading.style.display = 'block';
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            
            try {
              // 使用 wagmi 连接
              const result = await connect(this.config, { connector });
              
              if (result.accounts && result.accounts.length > 0) {
                this.account = result.accounts[0];
                this.chainId = result.chainId;
                this.signer = await this.provider.getSigner(result.accounts[0]);
                
                // 清理
                document.body.removeChild(modalOverlay);
                document.head.removeChild(style);
                document.head.removeChild(loadingStyle);
                
                resolve(result.accounts[0]);
              }
            } catch (error) {
              // 恢复按钮状态
              if (loading) loading.style.display = 'none';
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              
              // 如果不是用户取消，显示错误
              if (error instanceof Error && !error.message.includes('User rejected')) {
                console.error('Connection failed:', error);
                // 可以在这里显示错误提示
              }
            }
          };

          walletContainer.appendChild(btn);
        });

        // 底部信息
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

        // 事件处理
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

        // 组装模态框
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
    // 如果已经初始化，直接返回账户
    if (this.account) {
      return this.account;
    }

    // 检查是否已经连接
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
      console.log('No existing connection found');
    }

    // 显示连接模态框
    return await this.connectWithRainbowKit();
  }

  close() {
    // 注意：不要销毁 provider，因为它可能被其他地方使用
    // this.provider.destroy();
    this.signer = null;
    this.account = null;
    this.chainId = null;
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
      
      if (error.code === 'NETWORK_ERROR' && error.message.includes('network changed')) {
        console.log('Network changed detected, retrying...');
        try {
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

  async switchNet(chainHexId: string) {
    const chainId = parseInt(chainHexId, 16);
    const currentId = await this.getNetworkId();
    
    if (currentId.toString() !== chainId.toString()) {
      try {
        await this.provider.send("wallet_switchEthereumChain", [
          { chainId: chainHexId },
        ]);
        
        // 更新内部状态
        this.chainId = chainId;
        if (this.account) {
          // 重新获取 signer 以确保它使用新的网络
          this.signer = await this.provider.getSigner(this.account);
        }
      } catch (e) {
        console.error('Failed to switch network:', e);
        throw e;
      }
    }
  }

  async sign(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error("Signer not initialized");
    }
    return await this.signer.signMessage(message);
  }
}

// 只读 Provider 实现（非浏览器环境，无私钥）
export class DelphinusReadOnlyConnector extends DelphinusBaseProvider<DelphinusBaseProviderType> {
  constructor(providerUrl: string) {
    super(GetBaseProvider(providerUrl));
  }

  async connect(): Promise<string> {
    throw new Error("Read-only provider cannot connect to wallet");
  }

  close() {
    // 只读 provider 不需要特殊清理
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

// 钱包 Provider 实现（非浏览器环境，有私钥）
export class DelphinusWalletConnector extends DelphinusBaseSigner<Wallet> {
  constructor(privateKey: string, provider: DelphinusBaseProviderType) {
    super(new Wallet(privateKey, provider));
  }

  async connect(): Promise<string> {
    return await this.signer.getAddress();
  }

  close() {
    // 钱包 provider 不需要特殊清理
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

  // 模拟调用合约方法
  async call(req: TransactionRequest) {
    return await this.signer.call(req);
  }
}
