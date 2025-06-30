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

// ========================================
// 🎯 MAIN WALLET HOOK (RECOMMENDED)
// ========================================

// Complete wallet context hook - provides all WalletContextType functionality
export {
  useWalletContext,
  type WalletContextType,
} from './hooks/useWalletContext';

// ========================================
// 🗄️ REDUX STATE MANAGEMENT (Advanced Usage)
// ========================================

// Redux store and utilities for advanced users
export {
  // Store configuration
  createDelphinusStore,
  
  // Redux core exports
  useSelector,
  useDispatch,
  ReduxProvider,
  
  // Typed Redux helpers
  type RootState,
  type AppDispatch,
  
  // Account state selectors
  selectL1Account,
  selectL2Account,
  selectLoginStatus,
  
  // Account actions
  setL1Account,
  resetAccountState,
} from './store';

// ========================================
// 🔧 ADVANCED HOOKS (For Custom Implementation)
// ========================================

// Split hooks for advanced users who need granular control
export {
  useConnection,
  useWalletActions,
} from './hooks';

// Account state type
export {
  type AccountState,
} from './types/account';

// ========================================
// 📚 Usage Guide
// ========================================

/*
RECOMMENDED USAGE - Complete Wallet Context:

```typescript
import { 
  DelphinusReactProvider, 
  useWalletContext,
  type WalletContextType 
} from 'zkwasm-minirollup-browser';

// In main.tsx
<DelphinusReactProvider appName="Your App">
  <App />
</DelphinusReactProvider>

// In your component - ONE HOOK for everything!
function WalletComponent() {
  const {
    isConnected,        // L1 connection status
    isL2Connected,      // L2 connection status  
    l1Account,          // L1 account info
    l2Account,          // L2 account info (full L2AccountInfo instance)
    playerId,           // [string, string] | null - PID array
    address,            // wallet address
    chainId,            // current chain ID
    connectL1,          // connect L1 wallet
    connectL2,          // connect L2 account
    disconnect,         // disconnect wallet
    setPlayerId,        // PID setter (derived from L2 account)
  } = useWalletContext();
  
  // Access L2 account methods directly
  const handleSerialize = () => {
    if (l2Account) {
      const serialized = l2Account.toSerializableData();
      console.log('Serialized L2 account:', serialized);
    }
  };
  
  return (
    <div>
      <p>L1: {isConnected ? '✅' : '❌'} | L2: {isL2Connected ? '✅' : '❌'}</p>
      <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
      <p>Address: {address}</p>
      <button onClick={connectL1}>Connect L1</button>
      <button onClick={connectL2}>Connect L2</button>
      <button onClick={handleSerialize}>Serialize L2 Account</button>
    </div>
  );
}
```

ADVANCED USAGE - Custom Redux Integration:
```typescript
import { 
  useSelector, 
  useDispatch,
  type RootState,
  createDelphinusStore
} from 'zkwasm-minirollup-browser';

// Direct Redux state access for advanced users
const { l1Account, l2account } = useSelector((state: RootState) => state.account);
```

Environment Configuration:
- Uses dotenv to automatically load .env files
- All variables use REACT_APP_ prefix
- Create .env file with: REACT_APP_CHAIN_ID, REACT_APP_DEPOSIT_CONTRACT, etc.
*/

