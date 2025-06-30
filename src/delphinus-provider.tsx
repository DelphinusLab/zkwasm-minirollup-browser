import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { mainnet, sepolia, type Chain } from 'wagmi/chains';
import { accountSliceReducer } from './reduxstate';
import { getEnvConfig } from './config/env-adapter';
import { setSharedWagmiConfig } from './providers/provider';

// Cache configuration to avoid repeated initialization
let cachedConfig: any = null;

// Simplified RainbowKit configuration function
export function createDelphinusRainbowKitConfig(options?: {
  appName?: string;
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
}) {
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
  const projectId = options?.projectId || envConfig.walletConnectId || 'YOUR_PROJECT_ID';

  cachedConfig = getDefaultConfig({
    appName: options?.appName || 'Delphinus zkWasm MiniRollup',
    projectId: projectId,
    chains: selectedChains,
  });

  // 将配置设置为全局共享配置，供其他组件使用
  setSharedWagmiConfig(cachedConfig);

  return cachedConfig;
}

// Reset cached configuration (for development debugging)
export function resetDelphinusConfig() {
  cachedConfig = null;
  defaultStore = null;
  // 同时清除共享配置
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
            // 忽略包含非序列化数据的 actions
            ignoredActions: [
              'persist/PERSIST', 
              'persist/REHYDRATE',
              // L2 账户相关 actions
              'account/deriveL2Account/pending',
              'account/deriveL2Account/fulfilled',
              'account/deriveL2Account/rejected',
              // L1 账户相关 actions
              'account/fetchAccount/pending',
              'account/fetchAccount/fulfilled', 
              'account/fetchAccount/rejected',
              // 存款相关 actions
              'account/deposit/pending',
              'account/deposit/fulfilled',
              'account/deposit/rejected',
              // 连接相关 actions
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
            // 忽略 action 中的特定路径
            ignoredActionsPaths: [
              'payload', 
              'meta.arg', 
              'payload.l2account',
              'payload.l1Account',
              'meta.arg.l2account',
              'meta.arg.l1account'
            ],
            // 忽略 state 中的特定路径
            ignoredPaths: [
              'account.l2account',
              'account.l1Account'
            ],
            // 忽略嵌套值检查
            ignoredNestedPaths: [
              'account.l2account.pubkey',
              'account.l2account.#prikey'
            ],
            // 完全禁用序列化检查 (最宽松的选项)
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
  appName?: string;
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
  queryClient?: QueryClient;
  store?: any; // Redux store
  wagmiConfig?: any;
}

// Unified Delphinus Provider component
export const DelphinusProvider: React.FC<DelphinusProviderProps> = ({
  children,
  appName = 'Delphinus zkWasm MiniRollup',
  projectId,
  chains,
  queryClient = defaultQueryClient,
  store = getDefaultStore(),
  wagmiConfig,
}) => {
  // Create or use provided wagmi configuration
  const config = wagmiConfig || createDelphinusRainbowKitConfig({
    appName,
    projectId,
    chains,
  });



  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ReduxProvider store={store}>
            {children}
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
          // 忽略包含非序列化数据的 actions
          ignoredActions: [
            'persist/PERSIST', 
            'persist/REHYDRATE',
            // L2 账户相关 actions
            'account/deriveL2Account/pending',
            'account/deriveL2Account/fulfilled',
            'account/deriveL2Account/rejected',
            // L1 账户相关 actions
            'account/fetchAccount/pending',
            'account/fetchAccount/fulfilled', 
            'account/fetchAccount/rejected',
            // 存款相关 actions
            'account/deposit/pending',
            'account/deposit/fulfilled',
            'account/deposit/rejected',
            // 连接相关 actions
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
          // 忽略 action 中的特定路径
          ignoredActionsPaths: [
            'payload', 
            'meta.arg', 
            'payload.l2account',
            'payload.l1Account',
            'meta.arg.l2account',
            'meta.arg.l1account'
          ],
          // 忽略 state 中的特定路径
          ignoredPaths: [
            'account.l2account',
            'account.l1Account'
          ],
          // 忽略嵌套值检查
          ignoredNestedPaths: [
            'account.l2account.pubkey',
            'account.l2account.#prikey'
          ],
          // 完全禁用序列化检查 (最宽松的选项)
          warnAfter: 128,
        },
      }),
  });
}

export default DelphinusProvider; 