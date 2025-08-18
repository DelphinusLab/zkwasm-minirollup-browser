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
import { getAccount } from 'wagmi/actions';



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

  // Reset provider for reconnection without stopping monitoring
  resetProviderForReconnection() {
    if (this.currentProvider) {
      // Check if it's DelphinusRainbowConnector (the only type that has this method)
      if ('resetForReconnection' in this.currentProvider && 
          typeof this.currentProvider.resetForReconnection === 'function') {
        (this.currentProvider as any).resetForReconnection();
      } else {
        // For other provider types, fall back to clearing instance
        this.currentProvider.close();
        this.currentProvider = null;
      }
    }
    // Keep providerConfig for smooth reconnection
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

// Reset provider for reconnection without stopping monitoring
export function resetProviderForReconnection() {
  ProviderManager.getInstance().resetProviderForReconnection();
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
  private monitoringStopFlag: (() => void) | null = null;
  private lastKnownWagmiState: { address?: string; chainId?: number; isConnected: boolean } | null = null;
  private signerHealthChecker: NodeJS.Timeout | null = null;
  private lastSignerHealthCheck: number = 0;
  
  // Race condition protection
  private initializationLock: boolean = false;
  private initializationPromise: Promise<void> | null = null;

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
      
      console.log('🔍 Current wagmi account state:', {
        isConnected: account.isConnected,
        address: account.address,
        connector: account.connector?.name,
        internalState: {
          isInitialized: this.isInitialized,
          hasAccount: !!this.account,
          address: this.account
        }
      });
      
      // Skip wagmi provider if our internal state shows we're disconnected
      // This handles the case where wagmi state is stale after disconnect
      if (account.connector && account.isConnected && !this.account) {
        console.log('🚫 Wagmi shows connected but internal state shows disconnected, skipping wagmi provider');
      } else if (account.connector && account.isConnected) {
        console.log('Found existing wagmi connection, getting provider...');
        const provider = await account.connector.getProvider();
        
        if (provider) {
          // Validate the provider actually has connected accounts
          try {
            const accounts = await (provider as any).request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              console.log('✅ Successfully got provider from wagmi connector with valid accounts');
              return new BrowserProvider(provider as Eip1193Provider, "any");
            } else {
              console.warn('⚠️ Wagmi provider exists but has no accounts, will try reconnection');
            }
          } catch (error) {
            console.warn('⚠️ Failed to validate wagmi provider, will try reconnection:', error);
          }
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
              // Validate that the provider is actually connected
              const isProviderValid = await this.validateProviderConnection(provider);
              
              if (isProviderValid) {
                if (!this.isInitialized) {
                  console.log('✅ Successfully reconnected and validated provider');
                }
                return new BrowserProvider(provider as Eip1193Provider, "any");
              } else {
                console.warn('⚠️ Reconnected provider failed validation, clearing session');
                // Clear invalid session data
                try {
                  const { clearWalletConnectStorageOnly } = await import('../delphinus-provider');
                  clearWalletConnectStorageOnly();
                } catch (error) {
                  console.warn('Failed to clear invalid session:', error);
                }
              }
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

  // Enhanced initialization method with race condition protection
  async initialize(account: `0x${string}` | undefined, chainId: number) {
    if (!account) {
      throw new Error("No account connected");
    }

    // Return existing initialization promise if one is in progress
    if (this.initializationPromise) {
      console.log('⏳ Initialization already in progress, waiting for completion...');
      await this.initializationPromise;
      
      // After waiting, check if the result matches what we wanted
      if (this.isInitialized && 
          this.account?.toLowerCase() === account.toLowerCase() && 
          this.chainId === chainId) {
        console.log('✅ Previous initialization matches current request');
        return;
      } else {
        console.log('⚠️ Previous initialization was for different account/chain, proceeding with new initialization');
      }
    }

    // Check if already initialized with same parameters (atomic check)
    if (this.isInitialized && 
        this.account?.toLowerCase() === account.toLowerCase() && 
        this.chainId === chainId) {
      console.log('✅ Already initialized with same account/chain, skipping');
      return;
    }

    // Prevent concurrent initialization
    if (this.initializationLock) {
      throw new Error('Initialization already in progress. This should not happen if promises are handled correctly.');
    }

    // Set lock and create promise
    this.initializationLock = true;
    this.initializationPromise = this._doInitialize(account, chainId);
    
    try {
      await this.initializationPromise;
    } finally {
      // Always clear the lock and promise
      this.initializationLock = false;
      this.initializationPromise = null;
    }
  }

  // Private method that does the actual initialization
  private async _doInitialize(account: `0x${string}`, chainId: number): Promise<void> {
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
        
        // Start signer health monitoring
        this.startSignerHealthMonitoring();
        
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


  async connect(): Promise<string> {
    // First request account access permission
    const accounts = await this.provider.send("eth_requestAccounts", []);
    const signer = await this.provider.getSigner();
    const address = await signer.getAddress();
    return address;
  }

  // Start adaptive state consistency monitoring with proper cleanup
  private startStateConsistencyMonitoring() {
    // Always stop any existing monitoring first
    this.stopStateConsistencyMonitoring();
    
    let checkInterval = 5000; // Start with 5 seconds
    let consecutiveSuccesses = 0;
    let isMonitoringActive = true; // Flag to control the monitoring loop
    
    const scheduleNext = () => {
      // Check if monitoring should continue
      if (!isMonitoringActive || !this.isInitialized) {
        console.log('🛑 State monitoring stopped due to inactive flag or uninitialized state');
        return;
      }
      
      this.stateConsistencyChecker = setTimeout(async () => {
        // Double-check if we should still be monitoring
        if (!isMonitoringActive || !this.isInitialized) {
          console.log('🛑 State monitoring stopped mid-execution');
          return;
        }
        
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
          
          // Only schedule next check if still active
          if (isMonitoringActive && this.isInitialized) {
            scheduleNext();
          }
        } catch (error) {
          console.warn('⚠️ State consistency check failed:', error);
          
          // Only continue if still active and not in critical error state
          if (isMonitoringActive && this.isInitialized) {
            // Increase interval on errors to avoid spam
            checkInterval = Math.min(10000, checkInterval * 1.2);
            scheduleNext();
          }
        }
      }, checkInterval);
    };
    
    // Store the stop function for proper cleanup
    this.monitoringStopFlag = () => {
      isMonitoringActive = false;
    };
    
    scheduleNext();
    console.log('🔄 Started adaptive state consistency monitoring with cleanup controls');
  }
  
  // Stop state consistency monitoring with complete cleanup
  private stopStateConsistencyMonitoring() {
    console.log('🛑 Stopping state consistency monitoring...');
    
    // Clear the current timeout
    if (this.stateConsistencyChecker) {
      clearTimeout(this.stateConsistencyChecker);
      this.stateConsistencyChecker = null;
    }
    
    // Stop the monitoring loop by calling the stop flag function
    if (this.monitoringStopFlag) {
      this.monitoringStopFlag();
      this.monitoringStopFlag = null;
    }
    
    console.log('✅ State consistency monitoring stopped and cleaned up');
  }
  
  // Proactive signer health monitoring
  private startSignerHealthMonitoring() {
    // Stop any existing monitoring
    this.stopSignerHealthMonitoring();
    
    const performHealthCheck = async () => {
      if (!this.isInitialized || !this.signer || !this.account) {
        return;
      }
      
      try {
        const now = Date.now();
        
        // Only check health every 30 seconds to avoid excessive calls
        if (now - this.lastSignerHealthCheck < 30000) {
          return;
        }
        
        this.lastSignerHealthCheck = now;
        
        console.log('🔍 Performing proactive signer health check...');
        
        // Test 1: Check if signer can get address
        const signerAddress = await this.signer.getAddress();
        if (signerAddress.toLowerCase() !== this.account.toLowerCase()) {
          console.warn('⚠️ Signer health check failed: address mismatch', {
            signerAddress,
            expectedAddress: this.account
          });
          await this.handleSignerFailure('address_mismatch');
          return;
        }
        
        // Test 2: Check wagmi connection consistency
        if (this.config) {
          const currentAccount = getAccount(this.config);
          if (!currentAccount.isConnected || 
              currentAccount.address?.toLowerCase() !== this.account.toLowerCase()) {
            console.warn('⚠️ Signer health check failed: wagmi disconnected', {
              wagmiConnected: currentAccount.isConnected,
              wagmiAddress: currentAccount.address,
              expectedAddress: this.account
            });
            await this.handleSignerFailure('wagmi_disconnected');
            return;
          }
        }
        
        // Test 3: Test provider responsiveness with a simple call
        try {
          await this.provider.getNetwork();
        } catch (providerError) {
          console.warn('⚠️ Signer health check failed: provider unresponsive', providerError);
          await this.handleSignerFailure('provider_unresponsive');
          return;
        }
        
        console.log('✅ Signer health check passed');
        
      } catch (error) {
        console.warn('⚠️ Signer health check encountered error:', error);
        
        // Check for specific WalletConnect session errors
        const errorMessage = (error as Error)?.message || String(error);
        if (errorMessage.includes('No matching session') || 
            errorMessage.includes('session expired') ||
            errorMessage.includes('session_request')) {
          await this.handleSignerFailure('session_expired');
        } else {
          await this.handleSignerFailure('unknown_error');
        }
      }
    };
    
    // Initial health check after 5 seconds
    setTimeout(performHealthCheck, 5000);
    
    // Then check every 60 seconds
    this.signerHealthChecker = setInterval(performHealthCheck, 60000);
    
    console.log('🔄 Started proactive signer health monitoring');
  }
  
  private stopSignerHealthMonitoring() {
    if (this.signerHealthChecker) {
      clearInterval(this.signerHealthChecker);
      this.signerHealthChecker = null;
      console.log('🛑 Stopped signer health monitoring');
    }
  }
  
  // Handle signer failure with appropriate cleanup and recovery
  private async handleSignerFailure(reason: string) {
    console.warn(`🚨 Signer failure detected: ${reason}`);
    
    // Clear the failed signer immediately
    this.signer = null;
    
    // For session-related failures, trigger full cleanup
    if (reason === 'session_expired' || reason === 'wagmi_disconnected') {
      await this.handleWalletConnectSessionExpired(reason);
    } else {
      // For other failures, try to recover the signer without full disconnect
      console.log('🔄 Attempting signer recovery...');
      try {
        if (this.account && this.isInitialized) {
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get a fresh signer
          this.signer = await this.provider.getSigner(this.account);
          
          // Test the new signer
          const newSignerAddress = await this.signer.getAddress();
          if (newSignerAddress.toLowerCase() === this.account.toLowerCase()) {
            console.log('✅ Signer recovery successful');
          } else {
            console.error('❌ Signer recovery failed: address mismatch');
            this.signer = null;
          }
        }
      } catch (recoveryError) {
        console.error('❌ Signer recovery failed:', recoveryError);
        this.signer = null;
      }
    }
  }
  
  // Validate that provider is actually connected and responsive
  private async validateProviderConnection(provider: any): Promise<boolean> {
    try {
      // Set reasonable timeout for validation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Provider validation timeout')), 5000);
      });
      
      // Try to get accounts from the provider
      const accountsPromise = provider.request({ 
        method: 'eth_accounts' 
      });
      
      const accounts = await Promise.race([accountsPromise, timeoutPromise]);
      
      // Check if we got valid accounts
      if (!Array.isArray(accounts) || accounts.length === 0) {
        console.warn('⚠️ Provider validation failed: no accounts available');
        return false;
      }
      
      // Try to get chain ID to verify provider is responsive
      const chainIdPromise = provider.request({ 
        method: 'eth_chainId' 
      });
      
      const chainId = await Promise.race([chainIdPromise, timeoutPromise]);
      
      if (!chainId) {
        console.warn('⚠️ Provider validation failed: no chain ID');
        return false;
      }
      
      console.log('✅ Provider validation successful:', { 
        accountCount: accounts.length, 
        chainId 
      });
      
      return true;
      
    } catch (error) {
      console.warn('⚠️ Provider validation failed:', error);
      return false;
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
        // DON'T stop monitoring - keep it running to detect new connections
        // this.stopStateConsistencyMonitoring();
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
  
  // Handle WalletConnect session expiration with complete state cleanup
  private async handleWalletConnectSessionExpired(reason: string) {
    console.log(`🔌 Handling WalletConnect session expiration: ${reason}`);
    
    // Clear all internal state
    this.signer = null;
    this.isInitialized = false;
    this.account = null;
    this.chainId = null;
    this.lastKnownWagmiState = null;
    
    // Force disconnect wagmi to trigger UI state update
    console.log('🔌 Forcing wagmi disconnect due to session expiration...');
    try {
      const { disconnect } = await import('wagmi/actions');
      if (this.config) {
        await disconnect(this.config);
        console.log('✅ Wagmi disconnected due to session expiration');
      }
    } catch (disconnectError) {
      console.warn('Failed to trigger wagmi disconnect:', disconnectError);
    }
    
    console.log('✅ WalletConnect session cleanup completed');
  }

  // Reset state for reconnection without stopping monitoring
  resetForReconnection() {
    console.log('🔄 Resetting DelphinusRainbowConnector state for reconnection...');
    
    // Clear initialization lock to prevent deadlocks
    this.initializationLock = false;
    this.initializationPromise = null;
    
    // Clean up resources but keep monitoring running
    if (this.signer) {
      this.signer = null;
    }
    this.account = null;
    this.chainId = null;
    this.isInitialized = false;
    this.lastKnownWagmiState = null;
    
    console.log('✅ State reset completed, monitoring continues for new connections');
  }

  close() {
    console.log('🔌 Closing DelphinusRainbowConnector and cleaning up resources...');
    
    // Stop all monitoring first to prevent memory leaks
    this.stopStateConsistencyMonitoring();
    this.stopSignerHealthMonitoring();
    
    // Clear initialization lock to prevent deadlocks
    this.initializationLock = false;
    this.initializationPromise = null;
    
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
    // Always perform lightweight validation before returning signer
    if (this.signer && this.account && this.config) {
      try {
        // Quick validation: check if wagmi is still connected
        const currentAccount = getAccount(this.config);
        if (!currentAccount.isConnected || 
            currentAccount.address?.toLowerCase() !== this.account.toLowerCase()) {
          console.warn('⚠️ Signer invalid: wagmi connection lost');
          this.signer = null;
        } else {
          // Additional lightweight check: verify signer hasn't been invalidated
          // This is a quick check that doesn't require network calls
          const signerProvider = this.signer.provider;
          if (!signerProvider || signerProvider !== this.provider) {
            console.warn('⚠️ Signer invalid: provider mismatch');
            this.signer = null;
          }
        }
      } catch (error) {
        console.warn('⚠️ Signer validation failed:', error);
        this.signer = null;
      }
    }
    
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
          
          // Immediate validation of new signer
          const signerAddress = await this.signer.getAddress();
          if (signerAddress.toLowerCase() !== this.account.toLowerCase()) {
            console.error('❌ New signer address mismatch:', {
              signerAddress,
              expectedAddress: this.account
            });
            this.signer = null;
            throw new Error("Signer address mismatch after re-obtaining. Please reconnect your wallet.");
          }
          
          console.log('✅ Re-obtained and validated signer successfully');
          
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
          rejectOnce(new Error(
            `Network ${chainHexId} (chain ${targetChainId}) is not configured in your wallet. ` +
            `Please add this network manually and try again.`
          ));
        } else if (isUserRejection) {
          rejectOnce(new Error(
            `Network switch was rejected by user. You are still on the previous network. ` +
            `Please manually switch to chain ${targetChainId} to continue.`
          ));
        } else {
          // For other errors, verify current network state before rejecting
          this.getNetworkId().then(currentNetwork => {
            if (Number(currentNetwork) === targetChainId) {
              console.log('✅ Network switch actually succeeded despite error');
              this.chainId = targetChainId;
              resolveOnce();
            } else {
              console.error(`❌ Network switch failed: expected ${targetChainId}, currently on ${currentNetwork}`);
              this.signer = null;
              rejectOnce(new Error(
                `Network switch failed: ${e?.message || 'Unknown error'}. ` +
                `Expected chain ${targetChainId}, currently on ${currentNetwork}. ` +
                `Please manually switch to the correct network.`
              ));
            }
          }).catch(verifyError => {
            console.error('❌ Network verification failed:', verifyError);
            this.signer = null;
            rejectOnce(new Error(`Network switch failed: ${e?.message || 'Unknown error'}`));
          });
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
    
    // CRITICAL: Check actual wallet connection status before signing
    try {
      console.log('🔍 Verifying wallet connection status before signing...');
      
      // Check wagmi connection status
      if (!this.config) {
        console.error('❌ Wagmi config not available');
        this.isInitialized = false;
        this.account = null;
        this.signer = null;
        throw new Error("Wagmi config not available. Please reconnect your wallet.");
      }
      
      const currentAccount = getAccount(this.config);
      if (!currentAccount.isConnected) {
        console.error('❌ Wallet disconnected according to wagmi');
        this.isInitialized = false;
        this.account = null;
        this.signer = null;
        throw new Error("Wallet is disconnected. Please reconnect your wallet.");
      }
      
      // Verify the connected account matches our expected account
      if (!this.account || currentAccount.address?.toLowerCase() !== this.account.toLowerCase()) {
        console.error('❌ Account mismatch or account lost:', {
          expected: this.account,
          current: currentAccount.address,
          isConnected: currentAccount.isConnected
        });
        this.isInitialized = false;
        this.account = null;
        this.signer = null;
        throw new Error("Account mismatch detected. Current wallet account doesn't match expected account. Please reconnect.");
      }
      
      // Test the signer by getting its address (this will fail if WalletConnect session is stale)
      console.log('🧪 Testing signer connection...');
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== this.account.toLowerCase()) {
        console.error('❌ Signer address mismatch:', {
          signerAddress,
          expectedAddress: this.account
        });
        this.signer = null;
        throw new Error("Signer address mismatch. Please reconnect your wallet.");
      }
      
      console.log('✅ Wallet connection verified, proceeding with signature...');
      
    } catch (verificationError: any) {
      console.error('❌ Wallet connection verification failed:', verificationError);
      
      // Check if this is a WalletConnect session error
      const errorMessage = verificationError?.message || String(verificationError || '');
      if (errorMessage.includes('No matching session') || 
          errorMessage.includes('session expired') ||
          errorMessage.includes('session_request')) {
        
        await this.handleWalletConnectSessionExpired('verification failed');
        throw new Error("WalletConnect session expired or invalid. Please disconnect and reconnect your wallet.");
      }
      
      // For other errors, re-throw the original error
      throw verificationError;
    }
    
    console.log('📝 About to call signer.signMessage()...');
    try {
      const signature = await this.signer.signMessage(message);
      console.log('✅ Signature successful:', signature.substring(0, 20) + '...');
      return signature;
    } catch (error: any) {
      console.error('❌ Signature failed:', error);
      
      // Check if this is a WalletConnect session error
      const errorMessage = error?.message || String(error || '');
      if (errorMessage.includes('No matching session') || 
          errorMessage.includes('session expired') ||
          errorMessage.includes('session_request')) {
        
        await this.handleWalletConnectSessionExpired('signing failed');
        throw new Error("WalletConnect session expired during signing. Please disconnect and reconnect your wallet.");
      }
      
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
