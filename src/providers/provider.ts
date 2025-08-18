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
import { hasEthereumProvider } from '../utils/provider';
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
    const accounts = await this.provider.send("eth_requestAccounts", []);
    console.log('🔍 eth_requestAccounts result:', accounts);
    const signer = await this.provider.getSigner();
    const address = await signer.getAddress();
    console.log('🔍 getSigner address:', address);
    return address;
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

// Global configuration manager - avoid duplicate initialization
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

  // Get global shared wagmi configuration
  getSharedConfig(): ReturnType<typeof createConfig> | null {
    return this.config;
  }

  // Set global shared wagmi configuration
  setSharedConfig(config: ReturnType<typeof createConfig>) {
    if (!this.config) {
      this.config = config;

          }
  }

  // Check if configuration exists
  hasConfig(): boolean {
    return this.config !== null;
  }

  // Clear configuration (for reset)
  clearConfig() {
    this.config = null;
  }
}

// Get shared wagmi configuration, return null if none exists
function getSharedWagmiConfig(): ReturnType<typeof createConfig> | null {
  return WagmiConfigManager.getInstance().getSharedConfig();
}

// Set shared wagmi configuration
function setSharedWagmiConfig(config: ReturnType<typeof createConfig>) {
  WagmiConfigManager.getInstance().setSharedConfig(config);
}

// Export configuration manager related functions
export { getSharedWagmiConfig, setSharedWagmiConfig, WagmiConfigManager };


// RainbowKit Provider implementation
export class DelphinusRainbowConnector extends DelphinusBaseProvider<BrowserProvider> {
  private signer: JsonRpcSigner | null = null;
  private account: string | null = null;
  private chainId: number | null = null;
  private config: ReturnType<typeof createConfig> | null = null;
  private isInitialized: boolean = false;
  private stateConsistencyChecker: NodeJS.Timeout | null = null;
  private lastKnownWagmiState: { address?: string; chainId?: number; isConnected: boolean } | null = null;

  constructor() {
    // Don't rely on window.ethereum for initialization
    // Create a temporary provider that will be replaced during initialize
    const tempProvider = new BrowserProvider({
      request: async () => {
        throw new Error("Provider not initialized. Please call initialize() first.");
    }
    } as any, "any");
    
    super(tempProvider);
    this.config = getSharedWagmiConfig();
  }

  // Get current chain ID
  getCurrentChainId(): number | null {
    return this.chainId;
  }

  // Get correct provider from wagmi connector with session recovery
  private async getCorrectProvider(): Promise<BrowserProvider> {
    
    try {
      if (!this.config) {
        this.config = getSharedWagmiConfig();
      }
      
      if (!this.config) {
        throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
      }
      // First, try to get provider from current wagmi account
      const account = getAccount(this.config);
      
      if (account.connector && account.isConnected) {
        console.log('Found existing wagmi connection, getting provider...');
        const provider = await account.connector.getProvider();
        
        if (provider) {
          console.log('✅ Successfully got provider from wagmi connector');
          return new BrowserProvider(provider as Eip1193Provider, "any");
        }
      }

      // If no active connection, try to auto-reconnect (for WalletConnect session recovery)
      if (!this.isInitialized) {
        console.log('No active connection found, attempting to reconnect...');
      }
      
      // Import wagmi's reconnect function
      const { reconnect } = await import('wagmi/actions');
      
      try {
        const reconnectResult = await reconnect(this.config) as any[];
        
        if (reconnectResult && reconnectResult.length > 0) {
          // Wait for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the reconnected account
          const reconnectedAccount = getAccount(this.config);
          
          if (reconnectedAccount.connector && reconnectedAccount.isConnected) {
            const provider = await reconnectedAccount.connector.getProvider();
            
            if (provider) {
              if (!this.isInitialized) {
                console.log('✅ Successfully reconnected and got provider');
              }
              return new BrowserProvider(provider as Eip1193Provider, "any");
            }
          }
        }
      } catch (reconnectError) {
        if (!this.isInitialized) {
          console.warn('Reconnection failed (normal for first-time connections)');
        }
      }

      // If all else fails, check if we have window.ethereum as last resort
      if (hasEthereumProvider()) {
        if (!this.isInitialized) {
          console.warn('⚠️ Falling back to window.ethereum');
        }
        return new BrowserProvider(window.ethereum, "any");
      }

      // 提供详细的错误信息
      const errorDetails = {
        hasWindowEthereum: !!window.ethereum,
        wagmiConnectorCount: this.config?.connectors?.length || 0,
        configExists: !!this.config
      };
      console.error('Provider initialization failed with details:', errorDetails);
      throw new Error(`No Ethereum provider available. Please reconnect your wallet. Debug: ${JSON.stringify(errorDetails)}`);
      
    } catch (error) {
      console.error('Failed to get provider:', error);
      throw new Error(`Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Active provider state synchronization with polling
  private async waitForProviderStateSync(expectedAccount?: string, maxAttempts: number = 20): Promise<void> {
    console.log('🔄 Starting provider state synchronization...', { expectedAccount, maxAttempts });
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const [wagmiState, providerAccounts] = await Promise.all([
          this.config ? getAccount(this.config) : null,
          this.provider.send("eth_accounts", [])
        ]);
        
        console.log(`🔍 Sync attempt ${attempt}/${maxAttempts}:`, {
          wagmiConnected: wagmiState?.isConnected,
          wagmiAddress: wagmiState?.address,
          wagmiStatus: wagmiState?.status,
          providerAccounts: providerAccounts,
          expectedAccount
        });
        
        // Check basic provider state
        if (!providerAccounts || providerAccounts.length === 0) {
          if (attempt === maxAttempts) {
            throw new Error(`Provider has no connected accounts after ${maxAttempts} attempts`);
          }
          console.log(`⏳ Provider accounts not ready, waiting... (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 250));
          continue;
        }
        
        // If expectedAccount is provided, verify it matches
        if (expectedAccount) {
          const accountMatch = providerAccounts.some((addr: string) => 
            addr.toLowerCase() === expectedAccount.toLowerCase()
          );
          
          if (!accountMatch) {
            if (attempt === maxAttempts) {
              throw new Error(`Account mismatch after ${maxAttempts} attempts. Provider: ${providerAccounts}, Expected: ${expectedAccount}`);
            }
            console.log(`⏳ Account mismatch, waiting for sync... (${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 250));
            continue;
          }
        }
        
        // Check wagmi state consistency if config is available
        if (this.config && wagmiState) {
          if (!wagmiState.isConnected || 
              (expectedAccount && wagmiState.address?.toLowerCase() !== expectedAccount.toLowerCase())) {
            if (attempt === maxAttempts) {
              throw new Error(`Wagmi state inconsistent after ${maxAttempts} attempts. Wagmi: ${JSON.stringify({
                connected: wagmiState.isConnected,
                address: wagmiState.address,
                status: wagmiState.status
              })}, Expected: ${expectedAccount}`);
            }
            console.log(`⏳ Wagmi state not synced, waiting... (${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 250));
            continue;
          }
        }
        
        console.log(`✅ Provider state synchronized successfully on attempt ${attempt}`);
        return;
        
      } catch (error: any) {
        if (attempt === maxAttempts) {
          console.error('❌ Provider state sync failed permanently:', error);
          throw new Error(`Provider state synchronization failed: ${error.message}`);
        }
        console.warn(`⚠️ Sync attempt ${attempt} failed, retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  }

  // Enhanced initialization method with session recovery
  async initialize(account: `0x${string}` | undefined, chainId: number) {
    if (!account) {
      throw new Error("No account connected");
    }

    // Prevent duplicate initialization
    if (this.isInitialized && 
        this.account?.toLowerCase() === account.toLowerCase() && 
        this.chainId === chainId) {
      console.log('✅ Already initialized with same account/chain, skipping');
      return;
    }
    
    // Log only if this is truly a new initialization
    if (!this.isInitialized) {
      console.log('🔄 Initializing DelphinusRainbowConnector...', { account, chainId });
    } else {
      console.log('🔄 Re-initializing with different account/chain:', {
        oldAccount: this.account,
        newAccount: account,
        oldChain: this.chainId,
        newChain: chainId
      });
    }

    // Ensure we have wagmi config
    if (!this.config) {
      this.config = getSharedWagmiConfig();
      if (!this.config) {
        throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
      }
    }

    try {
      // Get correct provider with session recovery
      const correctProvider = await this.getCorrectProvider();
      
      // Replace the temporary provider with the correct one
      (this as any).provider = correctProvider;
      
      // Basic provider state validation (simplified)
      try {
        // Wait for provider to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify provider has accounts
        const accounts = await this.provider.send("eth_accounts", []);
        if (!accounts || accounts.length === 0) {
          throw new Error(`Provider has no connected accounts`);
        }
        
        console.log('✅ Provider state validated successfully');
      } catch (validationError: any) {
        console.error('❌ Provider state validation failed:', validationError);
        throw new Error(`Provider validation failed: ${validationError.message}`);
      }

      // Update internal state
      this.account = account;
      this.chainId = chainId;
    
      // Get signer - but only if we're sure the account is truly connected
      try {
        // First verify the account is actually connected in wagmi
        let currentAccount = getAccount(this.config);
        
        // If wagmi is still connecting, wait for it to finish (common during page refresh)
        if (currentAccount.status === 'connecting' || currentAccount.status === 'reconnecting') {
          console.log(`🕐 Wagmi is still ${currentAccount.status}, waiting up to 5 seconds for it to complete...`);
          
          let attempts = 0;
          const maxAttempts = 10; // 5 seconds total
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            currentAccount = getAccount(this.config);
            console.log(`🔍 Wagmi status check ${attempts + 1}/${maxAttempts}: status=${currentAccount.status}, isConnected=${currentAccount.isConnected}, address=${currentAccount.address}`);
            
            // Success: wagmi finished connecting and matches expected account
            if (currentAccount.isConnected && currentAccount.address?.toLowerCase() === account.toLowerCase()) {
              console.log('✅ Wagmi connection completed successfully');
              break;
            }
            
            // If status changed to disconnected, fail
            if (currentAccount.status === 'disconnected') {
              throw new Error(`Wagmi disconnected during initialization. Account ${account} is no longer connected.`);
            }
            
            attempts++;
          }
          
          // Final check after waiting
          if (!currentAccount.isConnected || currentAccount.address?.toLowerCase() !== account.toLowerCase()) {
            console.error('❌ Wagmi connection timeout or failed:', { 
              status: currentAccount.status, 
              isConnected: currentAccount.isConnected,
              address: currentAccount.address,
              expectedAddress: account
            });
            throw new Error(`Wagmi connection timeout. Expected account ${account} but wagmi status is ${currentAccount.status} with address ${currentAccount.address || 'none'}`);
          }
        } else if (!currentAccount.isConnected || currentAccount.address?.toLowerCase() !== account.toLowerCase()) {
          throw new Error(`Account ${account} is not properly connected in wagmi. Status: ${currentAccount.status}, Address: ${currentAccount.address || 'none'}`);
        }
        
        console.log('✅ Account verified as connected, getting signer...');
        this.signer = await this.provider.getSigner(account);
      
        // Verify signer address matches expected address
        const signerAddress = await this.signer.getAddress();
        if (signerAddress.toLowerCase() !== account.toLowerCase()) {
          console.warn('⚠️ Signer address mismatch:', {
            signerAddress,
            expectedAddress: account
          });
          
          // Try to get signer without specifying address
          this.signer = await this.provider.getSigner();
          const newSignerAddress = await this.signer.getAddress();
          
          if (newSignerAddress.toLowerCase() !== account.toLowerCase()) {
            throw new Error(`Signer address mismatch: expected ${account}, got ${newSignerAddress}`);
          }
        }
        
        this.isInitialized = true;
        
        // Only start monitoring if not already started
        if (!this.stateConsistencyChecker) {
          this.startStateConsistencyMonitoring();
        }
        
        console.log('✅ DelphinusRainbowConnector initialized successfully');
        
      } catch (signerError) {
        console.error('Failed to get signer during initialization:', signerError);
        throw new Error(`Signer initialization failed: ${signerError instanceof Error ? signerError.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Provider initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

    // Create genuine RainbowKit style connection modal
  private async connectWithRainbowKit(): Promise<string> {
    try {
      // Get shared configuration, throw error if none exists
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
                
                // Get the correct provider and signer after connection
                const correctProvider = await this.getCorrectProvider();
                (this as any).provider = correctProvider;
                this.signer = await correctProvider.getSigner(result.accounts[0]);
                
                // Cleanup
                document.body.removeChild(modalOverlay);
                document.head.removeChild(style);
                document.head.removeChild(loadingStyle);
                
                this.isInitialized = true;
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
    // If already initialized and has account, return account directly
    if (this.isInitialized && this.account) {
      return this.account;
    }

    // Ensure we have wagmi config before attempting connection
    if (!this.config) {
      this.config = getSharedWagmiConfig();
      if (!this.config) {
        throw new Error("No wagmi config available. Please ensure DelphinusProvider is used to wrap your app.");
      }
    }

    // Check if already connected using wagmi (session recovery)
    try {
      const account = getAccount(this.config);
      if (account.address && account.chainId && account.isConnected) {
        console.log('Found existing wagmi connection, initializing...');
        await this.initialize(account.address, account.chainId);
        return account.address;
      }
    } catch (error) {
      console.log('No existing wagmi connection found, showing connection modal');
    }

    // Show connection modal as the primary way to connect
    return await this.connectWithRainbowKit();
  }

  // Start adaptive state consistency monitoring
  private startStateConsistencyMonitoring() {
    if (this.stateConsistencyChecker) {
      clearInterval(this.stateConsistencyChecker);
    }
    
    let checkInterval = 5000; // Start with 5 seconds
    let consecutiveSuccesses = 0;
    
    const scheduleNext = () => {
      this.stateConsistencyChecker = setTimeout(async () => {
        try {
          const hasInconsistency = await this.checkStateConsistency();
          
          if (hasInconsistency) {
            // If inconsistency found, check more frequently
            consecutiveSuccesses = 0;
            checkInterval = Math.max(1000, checkInterval / 2);
          } else {
            // If consistent, gradually increase interval
            consecutiveSuccesses++;
            if (consecutiveSuccesses >= 3) {
              checkInterval = Math.min(30000, checkInterval * 1.5); // Max 30 seconds
            }
          }
          
          scheduleNext();
        } catch (error) {
          console.warn('⚠️ State consistency check failed:', error);
          scheduleNext();
        }
      }, checkInterval);
    };
    
    scheduleNext();
    console.log('🔄 Started adaptive state consistency monitoring');
  }
  
  // Stop state consistency monitoring
  private stopStateConsistencyMonitoring() {
    if (this.stateConsistencyChecker) {
      clearTimeout(this.stateConsistencyChecker);
      this.stateConsistencyChecker = null;
      console.log('⏹️ Stopped state consistency monitoring');
    }
  }
  
  // Check and correct state inconsistencies (returns true if inconsistency found)
  private async checkStateConsistency(): Promise<boolean> {
    if (!this.config || !this.isInitialized) {
      return false;
    }
    
    try {
      const [wagmiState, providerAccounts] = await Promise.all([
        getAccount(this.config),
        this.provider.send("eth_accounts", []).catch(() => [])
      ]);
      
      let hasInconsistency = false;
      
      // Check if wagmi state has changed significantly
      const stateChanged = !this.lastKnownWagmiState || 
        this.lastKnownWagmiState.address !== wagmiState.address ||
        this.lastKnownWagmiState.chainId !== wagmiState.chainId ||
        this.lastKnownWagmiState.isConnected !== wagmiState.isConnected;
      
      if (stateChanged) {
        this.lastKnownWagmiState = {
          address: wagmiState.address,
          chainId: wagmiState.chainId,
          isConnected: wagmiState.isConnected
        };
        hasInconsistency = true;
      }
      
      // Detect disconnection
      if (!wagmiState.isConnected && this.account) {
        console.log('⚠️ Wagmi disconnection detected, cleaning up');
        this.account = null;
        this.chainId = null;
        this.signer = null;
        this.isInitialized = false;
        this.stopStateConsistencyMonitoring();
        return true;
      }
      
      // Detect account change
      if (wagmiState.isConnected && wagmiState.address && 
          this.account && wagmiState.address.toLowerCase() !== this.account.toLowerCase()) {
        console.log('⚠️ Account change detected:', this.account, '→', wagmiState.address);
        this.account = wagmiState.address;
        this.signer = null;
        hasInconsistency = true;
      }
      
      // Detect network change
      if (wagmiState.chainId && this.chainId && wagmiState.chainId !== this.chainId) {
        console.log('⚠️ Network change detected:', this.chainId, '→', wagmiState.chainId);
        this.chainId = wagmiState.chainId;
        this.signer = null;
        hasInconsistency = true;
      }
      
      // Only log provider/wagmi mismatch if it's a new inconsistency
      if (wagmiState.isConnected && wagmiState.address && providerAccounts.length > 0) {
        const providerHasAccount = providerAccounts.some((addr: string) => 
          addr.toLowerCase() === wagmiState.address!.toLowerCase()
        );
        
        if (!providerHasAccount && hasInconsistency) {
          console.log('⚠️ Provider/Wagmi account mismatch:', {
            wagmiAddress: wagmiState.address,
            providerAccounts: providerAccounts
          });
        }
      }
      
      return hasInconsistency;
      
    } catch (error) {
      console.warn('⚠️ State consistency check error:', error);
      return true; // Treat errors as inconsistency
    }
  }
  
  close() {
    // Stop state monitoring first
    this.stopStateConsistencyMonitoring();
    
    // Clean up resources
    if (this.signer) {
      this.signer = null;
    }
    this.account = null;
    this.chainId = null;
    this.isInitialized = false;
    this.lastKnownWagmiState = null;
    
    // Force clear wagmi config to reset WalletConnect state
    try {
      if (this.config) {
        // Import disconnect function from wagmi
        import('wagmi/actions').then(({ disconnect }) => {
          if (this.config) {
            disconnect(this.config);
          }
        }).catch(e => console.warn('Failed to disconnect wagmi:', e));
      }
    } catch (error) {
      console.warn('Failed to clean up wagmi state:', error);
    }
  }

  async onAccountChange<T>(_cb: (account: string) => T) {
    // This functionality will be handled by wagmi's useAccount hook
    // For manual implementation, you could listen to wagmi's account changes
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
      throw error;
    }
  }

  async getJsonRpcSigner(): Promise<JsonRpcSigner> {
    if (!this.signer) {
      // 尝试重新获取 signer - 但要先检查连接状态
      if (this.account && this.isInitialized && this.config) {
        try {
          console.log('🔄 Attempting to re-obtain signer...');
          
          // Wait for provider state synchronization
          await this.waitForProviderStateSync(this.account);
          
          // Check if account is still connected in wagmi before attempting to get signer
          const currentAccount = getAccount(this.config);
          if (!currentAccount.isConnected || currentAccount.address?.toLowerCase() !== this.account.toLowerCase()) {
            console.warn('⚠️ Account no longer connected in wagmi, cannot get signer');
            this.isInitialized = false;
            this.account = null;
            this.chainId = null;
            throw new Error("Account disconnected. Please reconnect your wallet.");
          }
          
          // Get signer from current provider
          this.signer = await this.provider.getSigner(this.account);
          console.log('✅ Re-obtained signer successfully');
          
        } catch (error: any) {
          this.signer = null;
          this.isInitialized = false;
          this.account = null;
          this.chainId = null;
          throw error;
        }
      } else {
        throw new Error("Signer not initialized. Please connect wallet first.");
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

  // Event-driven network switching with active verification
  async switchNet(chainHexId: string) {
    const targetChainId = parseInt(chainHexId, 16);
    const currentId = await this.getNetworkId();
    
    if (currentId.toString() === targetChainId.toString()) {
      console.log(`✅ Already on target network ${targetChainId}`);
      return;
    }
    
    console.log(`🔄 Switching from chain ${currentId} to ${targetChainId} (${chainHexId})`);
    
    return new Promise<void>((resolve, reject) => {
      let networkChangeListener: ((chainId: string) => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;
      
      const cleanup = () => {
        if (networkChangeListener && window.ethereum) {
          window.ethereum.removeListener('chainChanged', networkChangeListener);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
      
      const resolveOnce = (result?: void) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(result);
        }
      };
      
      const rejectOnce = (error: any) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };
      
      // Set up network change listener BEFORE initiating switch
      if (window.ethereum) {
        networkChangeListener = (newChainId: string) => {
          const newChainIdInt = parseInt(newChainId, 16);
          console.log(`📡 Network change detected: ${newChainIdInt} (${newChainId})`);
          
          if (newChainIdInt === targetChainId) {
            console.log(`✅ Network switch confirmed via event: now on ${newChainIdInt}`);
            
            // Update internal state
            this.chainId = targetChainId;
            
            // Verify state synchronization and update signer
            this.waitForProviderStateSync(this.account || undefined)
              .then(async () => {
                if (this.account) {
                  try {
                    this.signer = await this.provider.getSigner(this.account);
                    console.log('✅ Signer updated for new network');
                  } catch (signerError) {
                    console.warn('⚠️ Failed to update signer after network switch:', signerError);
                    this.signer = null;
                  }
                }
                resolveOnce();
              })
              .catch(syncError => {
                console.error('❌ Provider state sync failed after network switch:', syncError);
                rejectOnce(new Error(`Network switched but provider state sync failed: ${syncError.message}`));
              });
          }
        };
        
        window.ethereum.on('chainChanged', networkChangeListener);
      }
      
      // Set timeout for the entire operation
      timeoutId = setTimeout(() => {
        rejectOnce(new Error(`Network switch timeout after 15 seconds. Target: ${targetChainId} (${chainHexId})`));
      }, 15000);
      
      // Initiate the network switch
      this.provider.send("wallet_switchEthereumChain", [
        { chainId: chainHexId },
      ]).then(() => {
        console.log('📡 Network switch request sent successfully');
        
        // Give some time for the event to fire, then do a fallback check
        setTimeout(async () => {
          if (!isResolved) {
            try {
              const currentNetwork = await this.getNetworkId();
              if (currentNetwork.toString() === targetChainId.toString()) {
                console.log('✅ Network switch confirmed via fallback check');
                this.chainId = targetChainId;
                
                // Update provider state and signer
                await this.waitForProviderStateSync(this.account || undefined);
                if (this.account) {
                  try {
                    this.signer = await this.provider.getSigner(this.account);
                    console.log('✅ Signer updated for new network');
                  } catch (signerError) {
                    console.warn('⚠️ Failed to update signer after network switch:', signerError);
                    this.signer = null;
                  }
                }
                resolveOnce();
              }
            } catch (error) {
              console.warn('⚠️ Fallback network check failed:', error);
            }
          }
        }, 2000);
      }).catch((e: any) => {
        console.error('❌ Network switch request failed:', e);
        
        // Check error types
        const isNetworkNotConfigured = e?.code === 4902 || 
                                      e?.error?.code === 4902 ||
                                      e?.message?.includes('Unrecognized chain ID') ||
                                      e?.message?.includes('Try adding the chain');
        
        const isUserRejection = e?.code === 4001 || 
                               e?.error?.code === 4001 ||
                               e?.message?.includes('User rejected');
        
        if (isNetworkNotConfigured) {
          rejectOnce(new Error(`Network ${chainHexId} is not configured in your wallet. Please add it manually and try again.`));
        } else if (isUserRejection) {
          rejectOnce(new Error(`Network switch rejected by user.`));
        } else {
          // For other errors, clear signer but keep connection
          this.signer = null;
          rejectOnce(new Error(`Network switch failed: ${e?.message || 'Unknown error'}`));
        }
      });
    });
  }

  async sign(message: string): Promise<string> {
    console.log('🔐 DelphinusRainbowConnector.sign() called with message:', message);
    
    if (!this.signer) {
      console.error('❌ Signer not initialized');
      throw new Error("Signer not initialized. Please connect wallet first.");
    }
    
    console.log('📝 About to call signer.signMessage()...');
    try {
      const signature = await this.signer.signMessage(message);
      console.log('✅ Signature successful:', signature.substring(0, 20) + '...');
      return signature;
    } catch (error: any) {
      console.error('❌ Signature failed:', error);
      this.signer = null;
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

  async onAccountChange<T>(_cb: (account: string) => T) {
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
    _contractAddress: string,
    _abi: InterfaceAbi
  ): Promise<DelphinusContract> {
    throw new Error("Read-only provider does not support signing contracts");
  }

  async switchNet(_chainHexId: string) {
    throw new Error("Read-only provider cannot switch networks");
  }

  async sign(_message: string): Promise<string> {
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

  async onAccountChange<T>(_cb: (account: string) => T) {
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

  async switchNet(_chainHexId: string) {
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
