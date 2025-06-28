import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { mainnet, sepolia, type Chain } from 'wagmi/chains';
import { accountSlice } from './reduxstate';
import { getWalletConnectId, getEnvConfig } from './env-adapter';

// 缓存配置以避免重复初始化
let cachedConfig: any = null;

// 简化的 RainbowKit 配置函数
export function createDelphinusRainbowKitConfig(options?: {
  appName?: string;
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
}) {
  // If cached configuration exists, return directly
  if (cachedConfig) {
    return cachedConfig;
  }

  // 从环境变量获取配置
  const envConfig = getEnvConfig();
  console.log('Creating RainbowKit config with env:', envConfig);
  
  // 根据环境变量的 chainId 选择链
  const getChains = (): readonly [Chain, ...Chain[]] => {
    if (options?.chains) {
      return options.chains;
    }
    
    // 根据环境变量的 chainId 选择默认链
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
        return [sepolia, mainnet]; // 默认包含测试网和主网
    }
  };

  cachedConfig = getDefaultConfig({
    appName: options?.appName || 'Delphinus zkWasm MiniRollup',
    projectId: options?.projectId || envConfig.walletConnectId || 'YOUR_PROJECT_ID',
    chains: getChains(),
  });

  return cachedConfig;
}

// 重置缓存的配置（用于开发调试）
export function resetDelphinusConfig() {
  cachedConfig = null;
  defaultStore = null;
}

// 创建默认的查询客户端
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

// 缓存默认 store 以避免重复创建
let defaultStore: any = null;

// 创建默认的 Redux store
function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = configureStore({
      reducer: {
        account: accountSlice.reducer,
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

// 统一的 Provider 组件配置接口
export interface DelphinusProviderProps {
  children: React.ReactNode;
  appName?: string;
  projectId?: string;
  chains?: readonly [Chain, ...Chain[]];
  queryClient?: QueryClient;
  store?: any; // Redux store
  wagmiConfig?: any;
}

// 统一的 Delphinus Provider 组件
export const DelphinusProvider: React.FC<DelphinusProviderProps> = ({
  children,
  appName = 'Delphinus zkWasm MiniRollup',
  projectId,
  chains,
  queryClient = defaultQueryClient,
  store = getDefaultStore(),
  wagmiConfig,
}) => {
  // 创建或使用提供的 wagmi 配置
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

// 简化的配置函数，用于创建自定义 store
export function createDelphinusStore(additionalReducers?: any) {
  return configureStore({
    reducer: {
      account: accountSlice.reducer,
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