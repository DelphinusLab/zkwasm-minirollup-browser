// ========================================
// 🚀 NEW PROVIDER DESIGN PATTERN EXPORTS
// ========================================

// Provider 接口和类型
export {
  type DelphinusProvider,
  type ProviderConfig,
  
  // Provider 管理器函数
  getProvider,
  setProviderConfig,
  clearProvider,
  withProvider,
  
  // 具体的 Provider 实现
  DelphinusBrowserConnector,
  DelphinusRainbowConnector,
  DelphinusReadOnlyConnector,
  DelphinusWalletConnector,
  
  // 工具函数
  GetBaseProvider,
  type DelphinusBaseProviderType,
} from "./provider.js";

// 合约相关导出
export {
  DelphinusContract,
  withBrowserConnector,
  withReadOnlyConnector,
  withDelphinusWalletConnector,
} from "./client.js";

// 环境变量适配器导出
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

// RainbowKit 组件和 Hooks
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

// RainbowKit 钱包
export {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  phantomWallet,
  okxWallet,
  trustWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Wagmi 核心
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

// Wagmi 链配置
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

// TanStack Query (Wagmi 依赖)
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

// 统一的 Provider 组件（包装所有必要的 Provider）
export {
  DelphinusProvider as DelphinusReactProvider,
  createDelphinusStore,
  createDelphinusRainbowKitConfig,
  resetDelphinusConfig,
  type DelphinusProviderProps,
} from './delphinus-provider';

// 新的 zkWasm SDK 导出 - 状态管理和 React Hooks
export {
  // Reducer
  default as accountReducer,
  
  // 新的 Provider 模式 React Hook
  useZkWasmWallet,
  
  // 完整的钱包连接和登录流程
  connectWalletAndLoginL1WithHooksAsync,
  
  // 工具函数
  createRainbowKitHooks,
  createZkWasmWalletHook,
  
  // Async Actions
  depositAsync,
  depositWithRainbowKitAsync,
  loginL1AccountAsync,
  loginL1AccountWithRainbowKitAsync,
  loginL2AccountAsync,
  loginL2AccountWithRainbowKitAsync,
  
  // 状态管理
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

// Rainbow 适配器 - 新的 Provider 模式版本
export {
  initializeRainbowProvider,
  cleanupRainbowProvider,
  withRainbowKitConnector,
  reinitializeRainbowProvider,
} from "./rainbow-adapter.js";

// ========================================
// 📦 LEGACY EXPORTS (Backward Compatibility)
// ========================================

// Legacy state management
export {
  ConnectState,
  createStateSlice,
  type PropertiesState,
  type RequestError
} from "./reduxconnect.js";

// Legacy account slice exports (these are actually in reduxstate.js)
export {
  accountSlice as AccountSlice,
  default as AccountSliceReducer
} from "./reduxstate.js";

// Legacy connection utilities
export {
  getRpc,
  getRpcUrl,
  setRpcUrl,
} from "./connect.js";

// Legacy address utilities
export {
  signMessageWithRainbowKit,
  switchNetworkWithRainbowKit,
} from "./address.js";

// Legacy wagmi configuration
export {
  wagmiConfig,
} from "./wagmi-config.js";

// Legacy rainbow adapter (deprecated - throws errors for new projects)
export {
  useRainbowKitAdapter,
} from "./rainbow-adapter.js";

// Legacy hooks (deprecated - use new useZkWasmWallet instead)
export {
  useZkWasmWalletLegacy,
} from './zkwasm-hooks.js';

// ========================================
// 📚 MIGRATION GUIDE
// ========================================

/*
MIGRATION FROM OLD TO NEW PATTERN:

OLD (Deprecated):
```typescript
import { useZkWasmWallet } from 'zkwasm-minirollup-browser';
// Requires complex wagmi providers setup
```

NEW (Recommended - Option 1: Unified Provider):
```typescript
import { DelphinusReactProvider, useZkWasmWallet } from 'zkwasm-minirollup-browser';

// In your main.tsx
<DelphinusReactProvider appName="Your App">
  <App />
</DelphinusReactProvider>

// In your components
const wallet = useZkWasmWallet();
```

NEW (Option 2: Direct Provider Pattern):
```typescript
import { 
  useZkWasmWallet, 
  setProviderConfig, 
  withProvider 
} from 'zkwasm-minirollup-browser';

// Configure provider (do this once in your app)
setProviderConfig({ type: 'browser' });

// Use the hook (no providers needed)
const wallet = useZkWasmWallet();

// Or use provider directly
const result = await withProvider(async (provider) => {
  return await provider.connect();
});
```

RainbowKit Components (All available from SDK):
```typescript
import { 
  ConnectButton, 
  useConnectModal, 
  useAccount 
} from 'zkwasm-minirollup-browser';
// No need to install RainbowKit separately!
```

Environment Variables:
- All projects now use REACT_APP_ prefix
- Works with CRA, Next.js, Vite, and custom builds
- See COMPATIBILITY_GUIDE.md for details
*/

