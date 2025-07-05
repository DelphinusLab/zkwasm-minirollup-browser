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
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  ledgerWallet,
  phantomWallet,
  okxWallet,
  bitgetWallet,
  imTokenWallet,
  injectedWallet,
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

  // 记录 Project ID 的实际值用于调试
  console.log('🔍 WalletConnect Project ID Debug:');
  console.log('  - options?.projectId:', options?.projectId);
  console.log('  - envConfig.walletConnectId:', envConfig.walletConnectId);
  console.log('  - Final projectId:', projectId);
  console.log('  - projectId type:', typeof projectId);
  console.log('  - projectId length:', projectId?.length);

  // 验证 Project ID
  if (!projectId || projectId.trim() === '' || projectId === 'YOUR_PROJECT_ID') {
    const errorMessage = 'WalletConnect Project ID is required for mobile wallet connections!';
    const instructionMessage = 'Please set REACT_APP_WALLETCONNECT_PROJECT_ID in your .env file';
    const getIdMessage = 'Get your Project ID at: https://cloud.walletconnect.com/';
    
    throw new Error(`${errorMessage} ${instructionMessage} ${getIdMessage}`);
  }

  // 确认传递给 RainbowKit 的 Project ID
  console.log('✅ Creating RainbowKit config with Project ID:', projectId);
  
  cachedConfig = getDefaultConfig({
    appName: options.appName, // Use provided appName directly, no default value
    projectId: projectId,
    chains: selectedChains,
    wallets: [
      {
        groupName: 'Popular',
        wallets: [
          metaMaskWallet,
          walletConnectWallet,
          coinbaseWallet,
          rainbowWallet,
        ],
      },
      {
        groupName: 'Mobile Wallets',
        wallets: [
          trustWallet,
          tokenPocketWallet,
          phantomWallet,
          okxWallet,
          bitgetWallet,
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

  return cachedConfig;
}

// Reset cached configuration (for development debugging)
export function resetDelphinusConfig() {
  cachedConfig = null;
  defaultStore = null;
  const { WagmiConfigManager } = require('./providers/provider');
  WagmiConfigManager.getInstance().clearConfig();
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
            ignoredActionsPaths: [
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
export function createDelphinusStore(additionalReducers?: any) {
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
          ],
          // Ignore specific paths in actions
          ignoredActionsPaths: [
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

export default DelphinusProvider; 