import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { mainnet, sepolia, type Chain } from 'wagmi/chains';
import { accountSliceReducer } from './reduxstate';
import { getEnvConfig } from './config/env-adapter';

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
  console.log('Creating RainbowKit config with env:', envConfig);
  
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

  cachedConfig = getDefaultConfig({
    appName: options?.appName || 'Delphinus zkWasm MiniRollup',
    projectId: options?.projectId || envConfig.walletConnectId || 'YOUR_PROJECT_ID',
    chains: getChains(),
  });

  return cachedConfig;
}

// Reset cached configuration (for development debugging)
export function resetDelphinusConfig() {
  cachedConfig = null;
  defaultStore = null;
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
            ignoredActions: [
              'persist/PERSIST', 
              'persist/REHYDRATE',
              'account/deriveL2Account/fulfilled',
              'account/deriveL2AccountRainbowKit/fulfilled',
            ],
            ignoredActionsPaths: ['payload', 'meta.arg'],
            ignoredPaths: ['account.l2account'],
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
          ignoredActions: [
            'persist/PERSIST', 
            'persist/REHYDRATE',
            'account/deriveL2Account/fulfilled',
            'account/deriveL2AccountRainbowKit/fulfilled',
          ],
          ignoredActionsPaths: ['payload', 'meta.arg'],
          ignoredPaths: ['account.l2account'],
        },
      }),
  });
}

export default DelphinusProvider; 