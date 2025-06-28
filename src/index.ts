// ========================================
// 🚀 NEW PROVIDER DESIGN PATTERN EXPORTS
// ========================================

// Provider interfaces and types
export {
  type DelphinusProvider,
  type ProviderConfig,
  
  // Provider manager functions
  getProvider,
  setProviderConfig,
  clearProvider,
  withProvider,
  
  // Concrete Provider implementations
  DelphinusBrowserConnector,
  DelphinusRainbowConnector,
  DelphinusReadOnlyConnector,
  DelphinusWalletConnector,
  
  // Utility functions
  GetBaseProvider,
  type DelphinusBaseProviderType,
} from "./provider.js";

// Contract related exports
export {
  DelphinusContract,
  withBrowserConnector,
  withReadOnlyConnector,
  withDelphinusWalletConnector,
} from "./client.js";

// Environment variable adapter exports
export {
  getEnvConfig,
  getChainId,
  getDepositContract,
  getTokenContract,
  getWalletConnectId,
  getMode,
  validateEnvConfig,
  setCustomConfig,
  getCustomConfig,
  getFinalConfig,
  type EnvConfig,
} from "./env-adapter.js";

// ========================================
// 🌈 RAINBOWKIT & WAGMI RE-EXPORTS
// ========================================

// RainbowKit components and Hooks
export {
  ConnectButton,
  RainbowKitProvider,
  useConnectModal,
  useAccountModal,
  useChainModal,
  connectorsForWallets,
  getDefaultWallets,
  getDefaultConfig,
  midnightTheme,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';

// RainbowKit wallets
export {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  phantomWallet,
  okxWallet,
  trustWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Wagmi core
export {
  WagmiProvider,
  createConfig,
  http,
  webSocket,
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
  useSignMessage,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from 'wagmi';

// Wagmi Actions
export {
  connect,
  disconnect,
  getAccount,
  getBalance,
  getChainId as getWagmiChainId,
  switchChain,
  signMessage,
  writeContract,
  readContract,
  waitForTransactionReceipt,
} from 'wagmi/actions';

// Wagmi chain configuration
export {
  mainnet,
  sepolia,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
} from 'wagmi/chains';

// TanStack Query (Wagmi dependency)
export {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from '@tanstack/react-query';

// ========================================
// 🚀 SIMPLIFIED RAINBOWKIT SETUP
// ========================================



// ========================================
// 🎯 UNIFIED DELPHINUS PROVIDER
// ========================================

// Unified Provider component (wraps all necessary Providers)
export {
  DelphinusProvider as DelphinusReactProvider,
  createDelphinusStore,
  createDelphinusRainbowKitConfig,
  resetDelphinusConfig,
  type DelphinusProviderProps,
} from './delphinus-provider';

// New zkWasm SDK exports - state management and React Hooks
export {
  // Reducer
  default as accountReducer,
  
  // New Provider pattern React Hook
  useZkWasmWallet,
  
  // Complete wallet connection and login flow
  connectWalletAndLoginL1WithHooksAsync,
  
  // Utility functions
  createRainbowKitHooks,
  createZkWasmWalletHook,
  
  // Async Actions
  depositAsync,
  depositWithRainbowKitAsync,
  loginL1AccountAsync,
  loginL1AccountWithRainbowKitAsync,
  loginL2AccountAsync,
  loginL2AccountWithRainbowKitAsync,
  
  // State management
  resetAccountState,
  
  // Selectors
  selectL1Account,
  selectL2Account,
  selectLoginStatus,
  
  // Types
  type AccountState,
  type L1AccountInfo,
  type L2AccountData,
  type L2AccountInfo,
  type RainbowKitHooks,
  type State
} from './reduxstate.js';

// Rainbow adapter - new Provider pattern version
export {
  initializeRainbowProvider,
  cleanupRainbowProvider,
  withRainbowKitConnector,
  reinitializeRainbowProvider,
} from "./rainbow-adapter.js";

// ========================================
// 📚 Usage Guide
// ========================================

/*
Usage:

Option 1: Unified Provider:
```typescript
import { DelphinusReactProvider, useZkWasmWallet } from 'zkwasm-minirollup-browser';

// In main.tsx
<DelphinusReactProvider appName="Your App">
  <App />
</DelphinusReactProvider>

// In components
const wallet = useZkWasmWallet();
```

Option 2: Direct Provider pattern:
```typescript
import { 
  useZkWasmWallet, 
  setProviderConfig, 
  withProvider 
} from 'zkwasm-minirollup-browser';

// Configure provider (execute once at app startup)
setProviderConfig({ type: 'browser' });

// Use hook
const wallet = useZkWasmWallet();

// Or use provider directly
const result = await withProvider(async (provider) => {
  return await provider.connect();
});
```

RainbowKit components:
```typescript
import { 
  ConnectButton, 
  useConnectModal, 
  useAccount 
} from 'zkwasm-minirollup-browser';
```

Environment variables:
- All projects use REACT_APP_ prefix
- Support for CRA, Next.js, Vite and custom builds
*/

