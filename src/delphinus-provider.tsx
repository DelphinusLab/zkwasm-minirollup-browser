import '@rainbow-me/rainbowkit/styles.css';
import React, { createContext, useContext } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  RainbowKitProvider, 
  getDefaultConfig
} from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  ledgerWallet,
  phantomWallet,
  okxWallet,
  bitgetWallet,
  imTokenWallet,
  injectedWallet,
  binanceWallet,
  safeWallet,
  argentWallet,
  braveWallet,
  zerionWallet,
  oneInchWallet,
  uniswapWallet,
  tokenPocketWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { mainnet, sepolia, type Chain } from 'wagmi/chains';
import accountSliceReducer from './store/account-slice';
import { getEnvConfig } from './config/env-adapter';
import { setSharedWagmiConfig } from './providers/provider';

// Cache configuration to avoid repeated initialization
let cachedConfig: any = null;

// Simplified RainbowKit configuration function
export function createDelphinusRainbowKitConfig(options: {
  appName: string; // Required parameter
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
}) {
  // Validate required parameters
  if (!options.appName || options.appName.trim().length === 0) {
    throw new Error('createDelphinusRainbowKitConfig: appName is required for L2 login and cannot be empty');
  }

  // If cached configuration exists, return directly
  if (cachedConfig) {
    return cachedConfig;
  }

  // Validate and clean WalletConnect sessions before creating config
  // This runs synchronously on first load, detailed validation happens during reconnect
  const hasValidSessions = validateAndCleanWalletConnectStorage();

  // Get configuration from environment variables
  const envConfig = getEnvConfig();

  // Select chains based on chainId from environment variables
  const getChains = (): readonly [Chain, ...Chain[]] => {
    if (options?.chains) {
      return options.chains;
    }

    // Select default chains based on chainId from environment variables
    switch (envConfig.chainId) {
      case 1:
        return [mainnet];
      case 11155111:
        return [sepolia];
      case 56:
        return [
          {
            id: 56,
            name: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: {
              default: { http: ['https://bsc-dataseed.binance.org'] },






            },
            blockExplorers: {
              default: { name: 'BscScan', url: 'https://bscscan.com' },
            },
          } as Chain,


        ];
      default:
        return [sepolia, mainnet]; // Default includes testnet and mainnet
    }
  };

  const selectedChains = getChains();
  const projectId = options?.projectId || envConfig.walletConnectId;

  // 验证 Project ID
  if (!projectId || projectId.trim() === '' || projectId === 'YOUR_PROJECT_ID') {
    const errorMessage = 'WalletConnect Project ID is required for mobile wallet connections!';
    const instructionMessage = 'Please set REACT_APP_WALLETCONNECT_PROJECT_ID in your .env file';
    const getIdMessage = 'Get your Project ID at: https://cloud.walletconnect.com/';

    throw new Error(`${errorMessage} ${instructionMessage} ${getIdMessage}`);
  }



  cachedConfig = getDefaultConfig({
    appName: options.appName, // Use provided appName directly, no default value
    projectId: projectId,
    chains: selectedChains,
    wallets: [
      {
        groupName: 'Popular',
        wallets: [
          metaMaskWallet,
          okxWallet,
          binanceWallet,
          trustWallet,
        ],
      },
      {
        groupName: 'Mobile Wallets',
        wallets: [
          bitgetWallet,
          rainbowWallet,
          tokenPocketWallet,
          phantomWallet,
          walletConnectWallet,
          imTokenWallet,
          argentWallet,
          zerionWallet,
          oneInchWallet,
          uniswapWallet,
        ],
      },
      {
        groupName: 'Browser & Hardware',
        wallets: [
          braveWallet,
          ledgerWallet,
          safeWallet,
        ],
      },
      {
        groupName: 'Other',
        wallets: [
          injectedWallet,
        ],
      },
    ],
    ssr: false, // Disable SSR for better client-side session recovery
  });

  // 验证配置是否成功创建
  if (!cachedConfig) {
    throw new Error('Failed to create Wagmi configuration. Please check your setup.');
  }

  // Set configuration as global shared configuration for other components to use
  setSharedWagmiConfig(cachedConfig);

  // Add global error handling for WalletConnect
  if (typeof window !== 'undefined') {
    // Handle both unhandled rejections and regular errors
    const handleWalletConnectError = (error: any, source: string) => {
      const errorMessage = error?.message || error?.reason?.message || String(error);
      
      if (errorMessage.includes('session_request') && 
          errorMessage.includes('without any listeners')) {
        console.warn(`❌ WalletConnect session_request without listeners (${source}) - clearing invalid session:`, error);
        
        // Clear WalletConnect storage but preserve validation cache for auto-reconnect detection
        clearWalletConnectStorageOnly();
        
        // Force disconnect by dispatching a custom event
        window.dispatchEvent(new CustomEvent('walletconnect-session-invalid', {
          detail: { reason: 'session_request_without_listeners', source }
        }));
        
        return true; // Handled
      }
      return false; // Not handled
    };

    // Listen for Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (handleWalletConnectError(event.reason, 'unhandledrejection')) {
        event.preventDefault();
      }
    });

    // Listen for regular errors
    window.addEventListener('error', (event) => {
      if (handleWalletConnectError(event.error, 'error')) {
        event.preventDefault();
      }
    });

    // Override console.error to catch logged errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Check if any argument contains the WalletConnect error pattern
      const errorText = args.join(' ');
      if (errorText.includes('session_request') && 
          errorText.includes('without any listeners')) {
        console.warn('❌ WalletConnect session_request detected in console.error - clearing invalid session');
        
        // Clear WalletConnect storage but preserve validation cache for auto-reconnect detection
        clearWalletConnectStorageOnly();
        
        // Force disconnect by dispatching a custom event
        window.dispatchEvent(new CustomEvent('walletconnect-session-invalid', {
          detail: { reason: 'session_request_without_listeners', source: 'console.error' }
        }));
        
        // Still log the original error but prefix it
        originalConsoleError.apply(console, ['[HANDLED WalletConnect Error]', ...args]);
        return;
      }
      
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
  }

  return cachedConfig;
}

// Reset cached configuration (for development debugging)
export async function resetDelphinusConfig() {
  cachedConfig = null;
  defaultStore = null;
  try {
    const { WagmiConfigManager } = await import('./providers/provider');
    WagmiConfigManager.getInstance().clearConfig();
  } catch (error) {
    console.warn('Failed to reset Delphinus config:', error);
  }
}

// Validate WalletConnect sessions with actual connectivity testing
export async function validateAndCleanWalletConnectStorage(): Promise<boolean> {
  try {
    console.log('🔍 Validating WalletConnect sessions...');
    
    // Check if there are any WalletConnect sessions
    const wcKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('walletconnect') || key.includes('wc@2'))) {
        wcKeys.push(key);
      }
    }
    
    if (wcKeys.length === 0) {
      console.log('✅ No WalletConnect sessions found');
      return false; // No sessions to validate
    }
    
    // Validate sessions with actual connectivity testing
    let hasValidSession = false;
    
    for (const key of wcKeys) {
      try {
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          
          // 1. Basic structure validation
          if (!parsed || (!parsed.accounts && !parsed.sessionProperties && !parsed.topic)) {
            console.log('🗑️ Invalid session structure for key:', key);
            localStorage.removeItem(key);
            continue;
          }
          
          // 2. Check session expiry
          if (parsed.expiry && Date.now() > parsed.expiry * 1000) {
            console.log('🗑️ Expired session for key:', key);
            localStorage.removeItem(key);
            continue;
          }
          
          // 3. Validate session with actual connectivity test
          const isSessionValid = await validateWalletConnectSession(parsed);
          
          if (isSessionValid) {
            console.log('✅ Valid session found for key:', key);
            hasValidSession = true;
          } else {
            console.log('🗑️ Session connectivity failed for key:', key);
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.log('🗑️ Corrupted session data for key:', key, error);
        localStorage.removeItem(key);
      }
    }
    
    if (!hasValidSession) {
      console.log('🧹 No valid sessions found, clearing all WalletConnect storage');
      clearWalletConnectStorage();
    }
    
    return hasValidSession;
    
  } catch (error) {
    console.warn('Failed to validate WalletConnect sessions:', error);
    // On validation error, clear everything to be safe
    clearWalletConnectStorage();
    return false;
  }
}

// Helper function to validate actual WalletConnect session connectivity
async function validateWalletConnectSession(sessionData: any): Promise<boolean> {
  try {
    // Basic validation - must have required fields
    if (!sessionData.topic && !sessionData.accounts) {
      return false;
    }
    
    // For WC v2, check if we can access the session
    if (sessionData.topic) {
      // Try to validate the session is still active
      // This is a basic check - in production you might want to ping the relay server
      const hasAccounts = sessionData.accounts && Array.isArray(sessionData.accounts) && sessionData.accounts.length > 0;
      const hasValidTopic = typeof sessionData.topic === 'string' && sessionData.topic.length > 10;
      
      return hasAccounts && hasValidTopic;
    }
    
    // For WC v1 or other formats
    if (sessionData.accounts && Array.isArray(sessionData.accounts)) {
      return sessionData.accounts.length > 0;
    }
    
    return false;
  } catch (error) {
    console.warn('Session validation error:', error);
    return false;
  }
}

// Clear only WalletConnect storage without validation cache
export function clearWalletConnectStorageOnly() {
  try {
    // Clear all WalletConnect related localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('walletconnect') || key.includes('wc@2') || key.includes('WALLETCONNECT'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 Cleared WalletConnect storage key:', key);
    });
    
    // Also clear wagmi storage
    localStorage.removeItem('wagmi.store');
    localStorage.removeItem('wagmi.wallet');
    localStorage.removeItem('wagmi.connected');
    
    console.log('✅ WalletConnect storage cleared (validation cache preserved)');
  } catch (error) {
    console.warn('Failed to clear WalletConnect storage:', error);
  }
}

// Clear WalletConnect session storage (used when sessions are confirmed invalid)
export function clearWalletConnectStorage() {
  try {
    // Clear all WalletConnect related localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('walletconnect') || key.includes('wc@2') || key.includes('WALLETCONNECT'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 Cleared WalletConnect storage key:', key);
    });
    
    // Also clear wagmi storage
    localStorage.removeItem('wagmi.store');
    localStorage.removeItem('wagmi.wallet');
    localStorage.removeItem('wagmi.connected');
    
    // Clear session validation cache from localStorage  
    const validationKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('session_validated_')) {
        validationKeysToRemove.push(key);
      }
    }
    
    validationKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🧹 Cleared session validation cache:', key);
    });
    
    console.log('✅ WalletConnect storage and validation cache cleared');
  } catch (error) {
    console.warn('Failed to clear WalletConnect storage:', error);
  }
}

// Create default query client
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

// Cache default store to avoid repeated creation
let defaultStore: any = null;

// Create default Redux store
function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = configureStore({
      reducer: {
        account: accountSliceReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore actions containing non-serializable data
            ignoredActions: [
              'persist/PERSIST', 
              'persist/REHYDRATE',
              // L2 account related actions
              'account/deriveL2Account/pending',
              'account/deriveL2Account/fulfilled',
              'account/deriveL2Account/rejected',
              // L1 account related actions
              'account/fetchAccount/pending',
              'account/fetchAccount/fulfilled', 
              'account/fetchAccount/rejected',
              // Deposit related actions
              'account/deposit/pending',
              'account/deposit/fulfilled',
              'account/deposit/rejected',
              // Connection related actions
              'account/connectAndLoginL1/pending',
              'account/connectAndLoginL1/fulfilled',
              'account/connectAndLoginL1/rejected',
              'account/connectAndLoginL1WithHooks/pending',
              'account/connectAndLoginL1WithHooks/fulfilled',
              'account/connectAndLoginL1WithHooks/rejected',
              // Redux action creators
              'account/setL1Account',
              'account/resetAccountState',
            ],
            // Ignore specific paths in actions
            ignoredActionPaths: [
              'payload', 
              'meta.arg', 
              'payload.l2account',
              'payload.l1Account',
              'meta.arg.l2account',
              'meta.arg.l1account'
            ],
            // Ignore specific paths in state
            ignoredPaths: [
              'account.l2account',
              'account.l1Account'
            ],
            // Ignore nested value checks
            ignoredNestedPaths: [
              'account.l2account.pubkey',
              'account.l2account.#prikey'
            ],
            // Completely disable serialization check (most lenient option)
            warnAfter: 128,
          },
        }),
    });
  }
  return defaultStore;
}

// Unified Provider component configuration interface
export interface DelphinusProviderProps {
  children: React.ReactNode;
  /**
   * Application name - used for L2 login signatures
   * 
   * ⚠️ Important Notice:
   * - This parameter is not just a display name, it is the signature message content for L2 account login
   * - Users will sign this message when connecting L2 account to generate L2 private key
   * - Same appName will generate the same L2 account for the same user
   * - Different appName will generate different L2 accounts for the same user
   * - Please choose a unique and stable application name, avoid frequent changes
   * 
   * @example "MyDApp v1.0", "GameXYZ Mainnet", "MyApp Production"
   */
  appName: string;
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
  queryClient?: QueryClient;
  store?: any; // Redux store
  wagmiConfig?: any;
}

// Create Delphinus Context to pass configuration information
interface DelphinusContextType {
  appName: string;
}

const DelphinusContext = createContext<DelphinusContextType>({
  appName: ''
});

// Export hook to get context
export const useDelphinusContext = () => useContext(DelphinusContext);

// Unified Delphinus Provider component
export const DelphinusProvider: React.FC<DelphinusProviderProps> = ({
  children,
  appName,
  projectId,
  chains,
  queryClient = defaultQueryClient,
  store = getDefaultStore(),
  wagmiConfig,
}) => {
  // Validate required parameters
  if (!appName || appName.trim().length === 0) {
    throw new Error('DelphinusProvider: appName is required and cannot be empty');
  }

  // Create or use provided wagmi configuration
  const config = wagmiConfig || createDelphinusRainbowKitConfig({
    appName,
    projectId,
    chains,
  });

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ReduxProvider store={store}>
            <DelphinusContext.Provider value={{ appName }}>
            {children}
            </DelphinusContext.Provider>
          </ReduxProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

// Simplified configuration function for creating custom store
export function createDelphinusStore(
  additionalReducers?: any,
  additionalIgnoredActions: string[] = [],
  additionalIgnoredActionPaths: string[] = [],
  additionalIgnoredPaths: string[] = [],
  additionalIgnoredNestedPaths: string[] = []
) {
  return configureStore({
    reducer: {
      account: accountSliceReducer,
      ...additionalReducers,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore actions containing non-serializable data
          ignoredActions: [
            'persist/PERSIST', 
            'persist/REHYDRATE',
            // L2 account related actions
            'account/deriveL2Account/pending',
            'account/deriveL2Account/fulfilled',
            'account/deriveL2Account/rejected',
            // L1 account related actions
            'account/fetchAccount/pending',
            'account/fetchAccount/fulfilled', 
            'account/fetchAccount/rejected',
            // Deposit related actions
            'account/deposit/pending',
            'account/deposit/fulfilled',
            'account/deposit/rejected',
            // Connection related actions
            'account/connectAndLoginL1/pending',
            'account/connectAndLoginL1/fulfilled',
            'account/connectAndLoginL1/rejected',
            'account/connectAndLoginL1WithHooks/pending',
            'account/connectAndLoginL1WithHooks/fulfilled',
            'account/connectAndLoginL1WithHooks/rejected',
            // Redux action creators
            'account/setL1Account',
            'account/resetAccountState',
            ...additionalIgnoredActions,
          ],
          // Ignore specific paths in actions
          ignoredActionPaths: [
            'payload', 
            'meta.arg', 
            'payload.l2account',
            'payload.l1Account',
            'meta.arg.l2account',
            "meta.arg.l1account",
            ...additionalIgnoredActionPaths,
          ],
          // Ignore specific paths in state
          ignoredPaths: [
            'account.l2account',
            "account.l1Account",
            ...additionalIgnoredPaths,
          ],
          // Ignore nested value checks
          ignoredNestedPaths: [
            'account.l2account.pubkey',
            "account.l2account.#prikey",
            ...additionalIgnoredNestedPaths,
          ],
          // Completely disable serialization check (most lenient option)
          warnAfter: 128,
        },
      }),
  });
}