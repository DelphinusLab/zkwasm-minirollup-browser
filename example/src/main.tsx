import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureStore } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { WagmiProvider } from 'wagmi'

import '@rainbow-me/rainbowkit/styles.css'
import { accountSlice } from '../../src/reduxstate'
import { wagmiConfig } from '../../src/wagmi-config'
import App from './App.tsx'

// 创建 QueryClient
const queryClient = new QueryClient()

// 创建 Redux store
const store = configureStore({
  reducer: {
    account: accountSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略这些 action types
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'account/deriveL2Account/fulfilled',
          'account/deriveL2AccountRainbowKit/fulfilled',
        ],
        // 忽略这些字段路径中的非序列化值
        ignoredActionsPaths: ['payload', 'meta.arg'],
        ignoredPaths: ['account.l2account'],
      },
    }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Provider store={store}>
            <App />
          </Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
) 