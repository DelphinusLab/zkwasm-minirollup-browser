# zkWasm Mini Rollup Browser SDK

A modern, type-safe SDK for zkWasm Mini Rollup integration with **unified wallet context API**, supporting multiple wallet types and blockchain interactions.

## 🚀 Key Features

- **🎯 Unified Wallet Context** - Single `useWalletContext` hook provides complete wallet functionality
- **🎨 Modern UI Integration** - Complete RainbowKit components exported from SDK
- **⚡ Simplified Setup** - Single `DelphinusProvider` replaces complex provider nesting
- **🔧 Environment Management** - Unified REACT_APP_ prefix with dotenv support
- **🔄 Compatibility** - Support for multiple React project types
- **🎯 Type Safety** - Full TypeScript support with comprehensive type definitions
- **🌐 Cross-Platform** - Works with CRA, Next.js, Vite, and custom builds
- **⚡ Performance Optimized** - Advanced hooks available for granular control

## 📋 Quick Start

### 1. Installation

```bash
npm install zkwasm-minirollup-browser
```

### 2. Basic Setup (Recommended)

```tsx
import React from 'react';
import { DelphinusReactProvider } from 'zkwasm-minirollup-browser';
import App from './App';

function Main() {
  return (
    <DelphinusReactProvider appName="My zkWasm App">
      <App />
    </DelphinusReactProvider>
  );
}

export default Main;
```

### 3. Environment Configuration

Create a `.env` file:

```env
# Required Configuration
REACT_APP_CHAIN_ID=11155111
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional Configuration
REACT_APP_MODE=development
```

> **Note**: The SDK uses dotenv to automatically load environment variables and supports unified `REACT_APP_` prefix for all project types (CRA, Next.js, Vite).

## 🏗️ Architecture Overview

### Unified Wallet Context Architecture

The SDK uses a unified wallet context approach for optimal developer experience:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            useWalletContext (Recommended)               │ │
│  │  • All wallet states and actions in one hook           │ │
│  │  • isConnected, isL2Connected, l1Account, l2Account    │ │
│  │  • playerId (PID array), address, chainId              │ │
│  │  • connectL1, connectL2, disconnect, deposit           │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Advanced Hooks (Optional)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  useConnection  │  │ useWalletActions│  │ Redux State  │ │
│  │   (State Only)  │  │ (Actions Only)  │  │ Management   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      SDK Core Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Provider Manager│  │ Environment     │  │ Type System  │ │
│  │                 │  │ Adapter (dotenv)│  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Ethers.js       │  │ RainbowKit      │  │ Wagmi        │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Unified Context

- **Simplicity**: One hook provides everything you need
- **Type Safety**: Complete TypeScript interface matching common wallet context patterns
- **Performance**: Optimized internal state management
- **Consistency**: Unified API reduces learning curve
- **Flexibility**: Advanced hooks available when needed

## 🔧 Provider Configuration

### Rainbow Provider (Recommended)

```tsx
import { setProviderConfig, useConnection, useWalletActions } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ type: 'rainbow' });
  }, []);

  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1 } = useWalletActions(address, chainId);
  
  // ... use hooks
}
```

### Browser Provider (MetaMask)

```tsx
import { setProviderConfig, useConnection, useWalletActions } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ type: 'browser' });
  }, []);

  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1 } = useWalletActions(address, chainId);
  
  // ... use hooks
}
```

### ReadOnly Provider

```tsx
import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ 
      type: 'readonly',
      providerUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key'
    });
  }, []);

  const queryData = async () => {
    const result = await withProvider(async (provider) => {
      return await provider.getNetworkId();
    });
    console.log('Network ID:', result);
  };
}
```

### Wallet Provider (Private Key)

```tsx
import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ 
      type: 'wallet',
      providerUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key',
      privateKey: 'your-private-key'
    });
  }, []);
}
```

## 🎯 Core API Usage

### Unified Wallet Context (Recommended)

```tsx
import React from 'react';
import { 
  useWalletContext,
  type WalletContextType 
} from 'zkwasm-minirollup-browser';

function WalletComponent() {
  const {
    // Connection states
    isConnected,        // L1 connection status
    isL2Connected,      // L2 connection status  
    l1Account,          // L1 account info
    l2Account,          // L2 account info (full L2AccountInfo instance)
    playerId,           // [string, string] | null - PID array
    address,            // wallet address
    chainId,            // current chain ID
    
    // Actions
    connectL1,          // connect L1 wallet
    connectL2,          // connect L2 account
    disconnect,         // disconnect wallet
    setPlayerId,        // PID setter (derived from L2 account)
    deposit,            // deposit tokens to L2
  } = useWalletContext();
  
  // Access L2 account methods directly
  const handleSerialize = () => {
    if (l2Account) {
      const serialized = l2Account.toSerializableData();
      console.log('Serialized L2 account:', serialized);
    }
  };
  
  // Handle deposit using unified context
  const handleDeposit = async () => {
    if (!isConnected || !isL2Connected) {
      alert('Please connect both L1 and L2 accounts first');
      return;
    }
    
    try {
      await deposit({
        tokenIndex: 0,
        amount: 0.01
      });
      alert('Deposit successful!');
    } catch (error) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error.message}`);
    }
  };
  
  return (
    <div>
      {/* Status Display */}
      <div className="status-section">
        <h3>Wallet Status</h3>
        <p>L1: {isConnected ? '✅' : '❌'} | L2: {isL2Connected ? '✅' : '❌'}</p>
        <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
        <p>Address: {address}</p>
        <p>Chain ID: {chainId}</p>
      </div>

      {/* Actions */}
      <div className="actions-section">
        {!isConnected ? (
          <button onClick={connectL1}>Connect L1 Wallet</button>
        ) : (
          <div>
            {!isL2Connected && (
              <button onClick={connectL2}>Connect L2 Account</button>
            )}
            
            {isL2Connected && (
              <button onClick={handleDeposit}>Deposit 0.01 ETH</button>
            )}
            
            <button onClick={disconnect}>Disconnect</button>
            <button onClick={handleSerialize}>Serialize L2 Account</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

## 🔄 State Management

### Unified Context vs Redux

The `useWalletContext` hook provides all wallet state internally. For advanced users who need direct Redux access:

```tsx
import { 
  useSelector, 
  useDispatch,
  type RootState,
  selectL1Account,
  selectL2Account,
  selectLoginStatus
} from 'zkwasm-minirollup-browser';

function ReduxComponent() {
  const dispatch = useDispatch();
  
  // Using selectors
  const l1Account = useSelector(selectL1Account);
  const l2Account = useSelector(selectL2Account);
  const status = useSelector(selectLoginStatus);
  
  // Or direct state access
  const { l1Account, l2account, status } = useSelector((state: RootState) => state.account);
  
  return <div>Status: {status}</div>;
}
```

## 🛠️ Advanced Usage

### Split Hooks (Advanced Users)

For advanced users who need granular control over performance and state management:

```tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useConnection, 
  useWalletActions,
  type RootState,
  type AccountState 
} from 'zkwasm-minirollup-browser';

function AdvancedWalletComponent() {
  const dispatch = useDispatch();
  
  // Split hooks for granular control
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
  
  // Direct Redux state access
  const { l1Account, l2account, status } = useSelector((state: RootState) => state.account);
  
  // Derived states
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2account;
  const isLoading = status.includes('Loading');

  const handleConnect = async () => {
    try {
      const result = await connectAndLoginL1(dispatch);
      console.log('Connected successfully!', result);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleL2Login = async () => {
    try {
      await loginL2(dispatch, "MyApp");
      console.log('L2 login successful!');
    } catch (error) {
      console.error('L2 login failed:', error);
    }
  };

  const handleDeposit = async () => {
    if (!isL1Connected || !isL2Connected) {
      alert('Please complete L1 and L2 login first');
      return;
    }

    try {
      await deposit(dispatch, {
        tokenIndex: 0,
        amount: 0.01,
        l1account: l1Account,
        l2account: l2account
      });
      console.log('Deposit successful!');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  return (
    <div>
      <p>Status: {status}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Address: {address}</p>
      
      <button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Connect & Login L1'}
      </button>
      
      {isL1Connected && (
        <button onClick={handleL2Login}>Login L2</button>
      )}
      
      {isL1Connected && isL2Connected && (
        <button onClick={handleDeposit}>Deposit</button>
      )}
      
      <button onClick={() => reset(dispatch)}>Reset</button>
    </div>
  );
}
```

### Custom Store Configuration

```tsx
import { 
  createDelphinusStore,
  ReduxProvider 
} from 'zkwasm-minirollup-browser';

// Create custom store with additional reducers
const store = createDelphinusStore({
  myCustomReducer: myCustomSlice.reducer,
});

function App() {
  return (
    <ReduxProvider store={store}>
      <YourApp />
    </ReduxProvider>
  );
}
```

### Environment Configuration

```tsx
import { 
  getEnvConfig,
  validateEnvConfig 
} from 'zkwasm-minirollup-browser';

function ConfiguredApp() {
  React.useEffect(() => {
    // Validate environment configuration
    const validation = validateEnvConfig();
    if (!validation.isValid) {
      console.error('Configuration errors:', validation.errors);
      return;
    }
    
    // Get environment config
    const config = getEnvConfig();
    console.log('Environment config:', config);
  }, []);
  
  return <YourApp />;
}
```

### Direct Provider Usage

```tsx
import { withProvider, setProviderConfig } from 'zkwasm-minirollup-browser';

// Configure provider first
setProviderConfig({ type: 'rainbow' });

// Sign a message directly with provider
const signMessage = async (message: string) => {
  return await withProvider(async (provider) => {
    return await provider.sign(message);
  });
};

// Get network information
const getNetworkInfo = async () => {
  return await withProvider(async (provider) => {
    const networkId = await provider.getNetworkId();
    return { networkId: networkId.toString() };
  });
};
```

## 🔍 Troubleshooting

### Common Issues

#### Environment Variables Not Found
```tsx
import { validateEnvConfig } from 'zkwasm-minirollup-browser';

const validation = validateEnvConfig();
if (!validation.isValid) {
  console.error('Environment validation failed:', validation.errors);
  // Each error in validation.errors array describes what's missing
}
```

#### Wallet Context Connection Issues
```tsx
import { useWalletContext } from 'zkwasm-minirollup-browser';

function DiagnosticComponent() {
  const { 
    isConnected, 
    isL2Connected, 
    address, 
    chainId, 
    l1Account, 
    l2Account,
    connectL1,
    connectL2 
  } = useWalletContext();

  const handleConnect = async () => {
    try {
      await connectL1();
    } catch (error) {
      if (error.message.includes('User rejected')) {
        alert('Please approve the connection in your wallet');
      } else if (error.message.includes('network')) {
        alert('Please check your network connection');
      } else {
        console.error('Connection error:', error);
        alert(`Connection failed: ${error.message}`);
      }
    }
  };

  const handleL2Connect = async () => {
    try {
      await connectL2();
    } catch (error) {
      console.error('L2 connection failed:', error);
      alert(`L2 connection failed: ${error.message}`);
    }
  };

  return (
    <div>
      <h3>Diagnostic Information</h3>
      <p>L1 Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>L2 Connected: {isL2Connected ? 'Yes' : 'No'}</p>
      <p>Address: {address || 'None'}</p>
      <p>Chain ID: {chainId || 'None'}</p>
      <p>L1 Account: {l1Account ? 'Available' : 'None'}</p>
      <p>L2 Account: {l2Account ? 'Available' : 'None'}</p>
      
      <button onClick={handleConnect}>Test L1 Connection</button>
      <button onClick={handleL2Connect}>Test L2 Connection</button>
    </div>
  );
}
```

#### Provider Configuration Issues
```tsx
import { setProviderConfig, getEnvConfig } from 'zkwasm-minirollup-browser';

// Ensure provider is configured before using wallet context
React.useEffect(() => {
  // Validate environment first
  const envConfig = getEnvConfig();
  console.log('Environment config:', envConfig);
  
  // Set provider configuration
  setProviderConfig({ type: 'rainbow' });
}, []);
```

#### PID (Player ID) Issues
```tsx
import { useWalletContext } from 'zkwasm-minirollup-browser';

function PIDDiagnostic() {
  const { l2Account, playerId } = useWalletContext();

  React.useEffect(() => {
    if (l2Account) {
      try {
        const [pid1, pid2] = l2Account.getPidArray();
        console.log('PID from L2 account:', [pid1.toString(), pid2.toString()]);
        console.log('PID from context:', playerId);
        
        // Verify they match
        const contextMatches = 
          playerId && 
          playerId[0] === pid1.toString() && 
          playerId[1] === pid2.toString();
        
        console.log('PID consistency:', contextMatches ? 'OK' : 'MISMATCH');
      } catch (error) {
        console.error('Failed to get PID:', error);
      }
    }
  }, [l2Account, playerId]);

  return (
    <div>
      <p>L2 Account: {l2Account ? 'Available' : 'None'}</p>
      <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
    </div>
  );
}
```

#### Advanced Hook Dependencies (For Split Hooks)
```tsx
// ❌ Wrong - Missing dependencies when using split hooks
const { connectAndLoginL1 } = useWalletActions(); 

// ✅ Correct - With required dependencies
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1 } = useWalletActions(address, chainId);

// ✅ Best - Use unified context instead
const { isConnected, address, chainId, connectL1 } = useWalletContext();
```

#### Error Boundary for Wallet Issues
```tsx
import React from 'react';

class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Wallet context error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Wallet Connection Error</h2>
          <p>Something went wrong with the wallet connection.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <WalletErrorBoundary>
      <DelphinusReactProvider>
        <YourApp />
      </DelphinusReactProvider>
    </WalletErrorBoundary>
  );
}
```

## 📄 License

MIT

## 🎉 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

For more detailed examples, see the [example](./example) directory.

### RainbowKit Components Integration

```tsx
import React from 'react';
import { 
  // RainbowKit components from SDK
  ConnectButton, 
  useConnectModal,
  // Unified wallet context
  useWalletContext
} from 'zkwasm-minirollup-browser';

function RainbowKitIntegration() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address, chainId, connectL1 } = useWalletContext();

  return (
    <div>
      {/* Official RainbowKit ConnectButton */}
      <ConnectButton />
      
      {/* Custom Connect Modal */}
      <button onClick={openConnectModal}>
        Custom Connect Button
      </button>
      
      {/* SDK Integration */}
      {isConnected && (
        <div>
          <p>Connected with: {address}</p>
          <p>Chain: {chainId}</p>
          <button onClick={connectL1}>
            Login L1 Account
          </button>
        </div>
      )}
    </div>
  );
}
```
