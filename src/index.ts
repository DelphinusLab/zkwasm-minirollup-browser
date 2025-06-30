// ========================================
// 🚀 NEW PROVIDER DESIGN PATTERN EXPORTS
// ========================================

// Provider interfaces and core functions
export {
  type DelphinusProvider,
  
  // Provider manager functions
  getProvider,
  setProviderConfig,
  withProvider,
  
  // Concrete Provider implementations (only used ones)
  DelphinusRainbowConnector,
} from "./providers/provider";

// Environment variable adapter exports
export {
  getEnvConfig,
  validateEnvConfig,
} from "./config/env-adapter";

// ========================================
// 🌈 RAINBOWKIT & WAGMI RE-EXPORTS
// ========================================

// Only export the RainbowKit components actually used in examples
export {
  ConnectButton,
  useConnectModal,
} from '@rainbow-me/rainbowkit';



// ========================================
// 🎯 UNIFIED DELPHINUS PROVIDER
// ========================================

// Unified Provider component (wraps all necessary Providers)
export {
  DelphinusProvider as DelphinusReactProvider,
} from './delphinus-provider';

// New zkWasm SDK exports - state management and React Hooks
export {
  // Connection state hook
  useConnection,
  
  // Wallet actions hook
  useWalletActions,
  
  // Types
  type AccountState,
} from './reduxstate';

// ========================================
// 📚 Usage Guide
// ========================================

/*
Usage:

Option 1: Unified Provider + Split Hooks (Recommended):
```typescript
import { 
  DelphinusReactProvider, 
  useConnection, 
  useWalletActions 
} from 'zkwasm-minirollup-browser';

// In main.tsx
<DelphinusReactProvider appName="Your App">
  <App />
</DelphinusReactProvider>

// In components that only need connection state
const { isConnected, address, chainId } = useConnection();

// In components that need wallet operations
const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
```

Option 2: Direct Provider pattern:
```typescript
import { 
  useConnection,
  useWalletActions,
  setProviderConfig, 
  withProvider 
} from 'zkwasm-minirollup-browser';

// Configure provider (execute once at app startup)
setProviderConfig({ type: 'rainbow' });

// Use split hooks
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1 } = useWalletActions(address, chainId);

// Or use provider directly
const result = await withProvider(async (provider) => {
  return await provider.connect();
});
```

RainbowKit components:
```typescript
import { 
  ConnectButton, 
  useConnectModal 
} from 'zkwasm-minirollup-browser';
```

Benefits of split hooks:
- Better performance (only re-render when needed)
- Cleaner code organization
- Easier testing and debugging

Environment variables:
- All projects use REACT_APP_ prefix
- Support for CRA, Next.js, Vite and custom builds
*/

