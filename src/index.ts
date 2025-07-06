// ========================================
// 🚀 CORE EXPORTS (Essential)
// ========================================

// Main Provider component - REQUIRED
export {
  DelphinusProvider as DelphinusReactProvider,
} from './delphinus-provider';

// Provider configuration - REQUIRED
export {
  setProviderConfig,
} from "./providers/provider";

// Main wallet hook - RECOMMENDED
export {
  useWalletContext,
  type WalletContextType,
} from './hooks/useWalletContext';

// RainbowKit components - USED IN EXAMPLES
export {
  ConnectButton,
  useConnectModal,
} from '@rainbow-me/rainbowkit';

// ========================================
// 📊 RPC THUNKS (Actually Used)
// ========================================

// RPC thunks used in frontend-nugget
export {
  getConfig,
  sendTransaction,
  queryState,
  queryInitialState,
} from './store/rpc-thunks';

// ========================================
// 🏪 APP SLICE (Used for ConnectState)
// ========================================

// ConnectState enum used in frontend-nugget
export {
  ConnectState,
} from './store/app-slice';

// ========================================
// 🏗️ MODELS (L2 Account)
// ========================================

// L2 Account model - USED
export {
  L2AccountInfo,
} from './models/L2AccountInfo';

// ========================================
// 🎯 TYPES (Essential TypeScript Support)
// ========================================

// Only essential types
export {
  type L2AccountData,
} from './types';

// ========================================
// 📚 Usage Guide
// ========================================

/*
RECOMMENDED USAGE:

```typescript
import { 
  DelphinusReactProvider, 
  useWalletContext,
  setProviderConfig 
} from 'zkwasm-minirollup-browser';

// In main.tsx - REQUIRED setup
setProviderConfig({ type: 'rainbow' });

// In App.tsx
<DelphinusReactProvider appName="Your App">
  <App />
</DelphinusReactProvider>

// In your component
function WalletComponent() {
  const {
    isConnected,
    isL2Connected,  
    l1Account,
    l2Account,
    connectL1,
    connectL2,
    disconnect,
  } = useWalletContext();
  
  return (
    <div>
      <button onClick={connectL1}>Connect L1</button>
      <button onClick={connectL2}>Connect L2</button>
    </div>
  );
}
```

ADVANCED USAGE (for frontend-nugget style projects):

```typescript
import { 
  getConfig,
  sendTransaction,
  queryState,
  queryInitialState,
  ConnectState,
  L2AccountInfo,
} from 'zkwasm-minirollup-browser';

// Use with Redux dispatch
dispatch(getConfig());
dispatch(sendTransaction({ cmd: cmdArray, prikey: privateKey }));

// Check connection state
if (connectState === ConnectState.Idle) {
  // Ready for interaction
}

// Create L2 account
const l2Account = new L2AccountInfo('0x' + privateKey);
```

Migration from Direct Imports:
- Replace: import { sendTransaction } from "zkwasm-minirollup-browser/dist/store/rpc-thunks";
- With: import { sendTransaction } from "zkwasm-minirollup-browser";
- Replace: import { ConnectState } from "zkwasm-minirollup-browser/dist/store/app-slice";  
- With: import { ConnectState } from "zkwasm-minirollup-browser";
*/

