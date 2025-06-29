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
  // New Provider pattern React Hook
  useZkWasmWallet,
  
  // Types
  type AccountState,
} from './reduxstate';

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
setProviderConfig({ type: 'rainbow' });

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
  useConnectModal 
} from 'zkwasm-minirollup-browser';
```

Environment variables:
- All projects use REACT_APP_ prefix
- Support for CRA, Next.js, Vite and custom builds
*/

