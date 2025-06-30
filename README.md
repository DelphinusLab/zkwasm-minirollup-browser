# zkWasm Mini Rollup Browser SDK

A modern, type-safe SDK for zkWasm Mini Rollup integration with optimized split hooks architecture, supporting multiple wallet types and blockchain interactions.

## 🚀 Key Features

- **🔗 Split Hooks Architecture** - Optimized performance with `useConnection` and `useWalletActions`
- **🎨 Modern UI Integration** - Complete RainbowKit components exported from SDK
- **⚡ Simplified Setup** - Single `DelphinusProvider` replaces complex provider nesting
- **🔧 Environment Management** - Unified REACT_APP_ prefix across all project types
- **🔄 Compatibility** - Support for multiple React project types
- **🎯 Type Safety** - Full TypeScript support with comprehensive type definitions
- **🌐 Cross-Platform** - Works with CRA, Next.js, Vite, and custom builds
- **⚡ Performance Optimized** - Separate hooks for connection state and wallet actions

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

> **Note**: The Provider pattern uses unified `REACT_APP_` prefix for all project types (CRA, Next.js, Vite).

## 🏗️ Architecture Overview

### Split Hooks Architecture

The SDK uses a modern split hooks approach for optimal performance:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  useConnection  │  │ useWalletActions│  │  Components  │ │
│  │   (State Only)  │  │ (Actions Only)  │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      SDK Core Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Provider Manager│  │ Environment     │  │ Type System  │ │
│  │                 │  │ Adapter         │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Provider Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Browser Provider│  │ Rainbow Provider│  │ Wallet       │ │
│  │                 │  │                 │  │ Provider     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Ethers.js       │  │ RainbowKit      │  │ Wagmi        │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Split Hooks

- **Better Performance**: Components only re-render when needed
- **Cleaner Code Organization**: Separation of concerns between state and actions  
- **Easier Testing**: Individual hooks can be tested independently
- **More Modular**: Use only what you need in each component

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

### Split Hooks Approach (Recommended)

```tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useConnection, 
  useWalletActions,
  type AccountState 
} from 'zkwasm-minirollup-browser';

// Define your Redux root state type
interface RootState {
  account: AccountState;
}

function WalletComponent() {
  const dispatch = useDispatch();
  
  // Split hooks for optimal performance
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
  
  // Redux state selectors
  const { l1Account, l2account, status } = useSelector((state: RootState) => state.account);
  
  // Derived states
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2account;
  const isL1Connecting = status === 'LoadingL1';
  const isL2Connecting = status === 'LoadingL2';
  const isDepositing = status === 'Deposit';

  const handleConnect = async () => {
    try {
      const result = await connectAndLoginL1(dispatch);
      console.log('Connected successfully!', result);
    } catch (error) {
      console.error('Connection failed:', error);
      if (error.message.includes('User rejected')) {
        alert('Please approve the connection in your wallet');
      } else {
        alert(`Connection failed: ${error.message}`);
      }
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

  const handleReset = async () => {
    await reset(dispatch);
  };

  return (
    <div>
      {/* Connection State */}
      <div>
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Address: {address || 'Not connected'}</p>
        <p>Chain ID: {chainId || 'Unknown'}</p>
        <p>Status: {status}</p>
      </div>

      {/* Connection Actions */}
      {!isConnected ? (
        <button onClick={handleConnect} disabled={isL1Connecting}>
          {isL1Connecting ? 'Connecting...' : 'Connect Wallet & Login L1'}
        </button>
      ) : (
        <div>
          {/* L2 Login */}
          {isL1Connected && !isL2Connected && (
            <button onClick={handleL2Login} disabled={isL2Connecting}>
              {isL2Connecting ? 'Logging in L2...' : 'Login L2'}
            </button>
          )}
          
          {/* Deposit */}
          {isL1Connected && isL2Connected && (
            <button onClick={handleDeposit} disabled={isDepositing}>
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
          )}
          
          {/* Reset */}
          <button onClick={handleReset}>Reset</button>
        </div>
      )}
    </div>
  );
}
```

### RainbowKit Components Integration

```tsx
import React from 'react';
import { 
  ConnectButton, 
  useConnectModal,
  useConnection,
  useWalletActions
} from 'zkwasm-minirollup-browser';

function RainbowKitDemo() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1 } = useWalletActions(address, chainId);

  return (
    <div>
      {/* Official ConnectButton */}
      <ConnectButton />
      
      {/* Custom button */}
      <button onClick={openConnectModal}>
        Custom Connect Button
      </button>
      
      {/* SDK wallet actions */}
      {isConnected && (
        <div>
          <p>Connected with: {address}</p>
          <button onClick={() => connectAndLoginL1(dispatch)}>
            Login L1 Account
          </button>
        </div>
      )}
    </div>
  );
}
```

## 🔄 State Management

### Redux State Structure

```typescript
interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: L2AccountInfo;
  status: 'Initial' | 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
}

interface RootState {
  account: AccountState;
}
```

### Status Flow

The status field follows a clear state machine pattern:

```
Initial → LoadingL1 → Ready (L1 success)
Initial → LoadingL1 → L1AccountError (L1 failure)

Ready → LoadingL2 → Ready (L2 success) 
Ready → LoadingL2 → L2AccountError (L2 failure)

Ready → Deposit → Ready (deposit success/failure)
```

### Status Meanings

- **`'Initial'`**: System just started, not ready yet
- **`'Ready'`**: System is ready with available accounts
- **`'Loading*'`**: Operation in progress
- **`'*Error'`**: Operation failed, requires user action

### Hook Usage Patterns

```tsx
// For components that only need connection state
function ConnectionStatus() {
  const { isConnected, address, chainId } = useConnection();
  
  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      Address: {address}
      Chain: {chainId}
    </div>
  );
}

// For components that need wallet actions
function WalletActions() {
  const dispatch = useDispatch();
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
  
  // Actions depend on connection state
  const handleConnect = () => connectAndLoginL1(dispatch);
  const handleL2Login = () => loginL2(dispatch, "MyApp");
  
  return (
    <div>
      <button onClick={handleConnect}>Connect L1</button>
      <button onClick={handleL2Login}>Login L2</button>
    </div>
  );
}
```

## 🛠️ Advanced Usage

### Environment Configuration

```tsx
import { 
  getEnvConfig,
  validateEnvConfig,
  setProviderConfig 
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
    
    // Set provider configuration
    setProviderConfig({ type: 'rainbow' });
  }, []);
  
  return <YourApp />;
}
```

### Direct Provider Usage

```tsx
import { withProvider } from 'zkwasm-minirollup-browser';

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

### Error Handling

```tsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Provider error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong with the wallet connection.</h1>;
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <DelphinusReactProvider>
        <YourApp />
      </DelphinusReactProvider>
    </ErrorBoundary>
  );
}
```

## 🔍 Troubleshooting

### Common Issues

#### Provider Not Initialized
```tsx
// Ensure provider config is set before use
React.useEffect(() => {
  setProviderConfig({ type: 'rainbow' });
}, []);
```

#### Environment Variables Not Found
```tsx
import { validateEnvConfig } from 'zkwasm-minirollup-browser';

const validation = validateEnvConfig();
if (!validation.isValid) {
  console.error('Environment validation failed:', validation.errors);
}
```

#### Connection Failures
```tsx
import { useSelector } from 'react-redux';

const handleConnect = async () => {
  try {
    await connectAndLoginL1(dispatch);
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

// Monitor status changes for error handling
const { status } = useSelector((state: RootState) => state.account);
React.useEffect(() => {
  if (status === 'L1AccountError') {
    console.log('L1 connection failed, please retry');
  } else if (status === 'L2AccountError') {
    console.log('L2 login failed, please retry');
  }
}, [status]);
```

#### Hook Dependencies
```tsx
// Always pass address and chainId to useWalletActions
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1 } = useWalletActions(address, chainId); // Required dependencies

// ❌ Wrong - Missing dependencies
const { connectAndLoginL1 } = useWalletActions(); 

// ✅ Correct - With dependencies
const { connectAndLoginL1 } = useWalletActions(address, chainId);
```

## 📄 License

MIT

## 🎉 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

For more detailed examples, see the [example](./example) directory.
