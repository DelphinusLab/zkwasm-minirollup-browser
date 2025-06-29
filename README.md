# zkWasm Mini Rollup Browser SDK

A modern, type-safe SDK for zkWasm Mini Rollup integration with unified Provider design pattern, supporting multiple wallet types and blockchain interactions.

## 🚀 Key Features

- **🔗 Unified Provider Pattern** - Single interface for all wallet types and blockchain interactions
- **🎨 Modern UI Integration** - Complete RainbowKit components exported from SDK
- **⚡ Simplified Setup** - Single `DelphinusProvider` replaces complex provider nesting
- **🔧 Environment Management** - Unified REACT_APP_ prefix across all project types
- **🔄 Compatibility** - Support for multiple React project types
- **🎯 Type Safety** - Full TypeScript support with comprehensive type definitions
- **🌐 Cross-Platform** - Works with CRA, Next.js, Vite, and custom builds
- **⚡ Performance Optimized** - Caching to prevent duplicate initializations

## 📋 Quick Start

### 1. Installation

```bash
npm install zkwasm-minirollup-browser
```

### 2. Basic Setup (Recommended)

```tsx
import React from 'react';
import { DelphinusProvider } from 'zkwasm-minirollup-browser';
import App from './App';

function Main() {
  return (
    <DelphinusProvider appName="My zkWasm App">
      <App />
    </DelphinusProvider>
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
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id   // needed when choose rainbow provider

# Optional Configuration
REACT_APP_MODE=development
```

> **Note**: The new Provider pattern uses unified `REACT_APP_` prefix for all project types (CRA, Next.js, Vite).

## 🏗️ Architecture Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  React Hooks    │  │  Redux Actions  │  │  Components  │ │
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

## 🔧 Provider Configuration

### Rainbow Provider (Recommended)

```tsx
import { setProviderConfig, useZkWasmWallet } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ type: 'rainbow' });
  }, []);

  const wallet = useZkWasmWallet();
  // ... use wallet
}
```

### Browser Provider (MetaMask)

```tsx
import { setProviderConfig, useZkWasmWallet } from 'zkwasm-minirollup-browser';

function App() {
  React.useEffect(() => {
    setProviderConfig({ type: 'browser' });
  }, []);

  const wallet = useZkWasmWallet();
  // ... use wallet
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

### useZkWasmWallet Hook

```tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useZkWasmWallet, selectL1Account, selectL2Account } from 'zkwasm-minirollup-browser';

function WalletComponent() {
  const dispatch = useDispatch();
  const wallet = useZkWasmWallet();
  const l1Account = useSelector(selectL1Account);
  const l2Account = useSelector(selectL2Account);
  
  const {
    isConnected,
    address,
    chainId,
    connectAndLoginL1,
    loginL2,
    deposit,
    disconnect,
    reset
  } = wallet;

  const handleConnect = async () => {
    try {
      const result = await connectAndLoginL1(dispatch);
      console.log('Connected successfully!', result);
    } catch (error) {
      console.error('Connection failed:', error);
      // Handle different error types
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
    if (!l1Account || !l2Account) {
      alert('Please complete L1 and L2 login first');
      return;
    }

    try {
      await deposit(dispatch, {
        tokenIndex: 0,
        amount: 0.01,
        l1account: l1Account,
        l2account: l2Account
      });
      console.log('Deposit successful!');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <p>Chain ID: {chainId}</p>
          <button onClick={handleL2Login}>Login L2</button>
          <button onClick={handleDeposit}>Deposit</button>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

### RainbowKit Components

```tsx
import React from 'react';
import { 
  ConnectButton, 
  useConnectModal, 
  useAccount 
} from 'zkwasm-minirollup-browser';

function RainbowKitDemo() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();

  return (
    <div>
      {/* Official ConnectButton */}
      <ConnectButton />
      
      {/* Custom button */}
      <button onClick={openConnectModal}>
        Custom Connect Button
      </button>
      
      {isConnected && (
        <p>Connected with: {address}</p>
      )}
    </div>
  );
}
```

## 🔄 State Management

### Redux State Structure

```typescript
interface RootState {
  account: {
    l1Account?: L1AccountInfo;
    l2account?: L2AccountInfo;
    status: 'Initial' | 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
  };
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

### Using Redux Selectors

```tsx
import { useSelector } from 'react-redux';
import { selectL1Account, selectL2Account, selectLoginStatus } from 'zkwasm-minirollup-browser';

function StatusComponent() {
  const l1Account = useSelector(selectL1Account);
  const l2Account = useSelector(selectL2Account);
  const status = useSelector(selectLoginStatus);

  // Derived status for UI
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2Account;
  const isLoading = status.includes('Loading');
  const hasError = status.includes('Error');
  const isReady = status === 'Ready';

  return (
    <div>
      <p>L1 Account: {l1Account?.address || 'Not connected'}</p>
      <p>L2 Account: {l2Account ? 'Connected' : 'Not connected'}</p>
      <p>Status: {status}</p>
      
      {/* UI based on status */}
      {isLoading && <div>Loading...</div>}
      {hasError && <div>Error: {status}</div>}
      {isReady && isL1Connected && <div>✅ Ready for operations</div>}
    </div>
  );
}
```

## 🛠️ Advanced Usage

### Custom Provider Configuration

```tsx
import { 
  createDelphinusRainbowKitConfig, 
  createDelphinusStore 
} from 'zkwasm-minirollup-browser';
import { polygon, arbitrum } from 'wagmi/chains';

// Custom chain configuration
const customConfig = createDelphinusRainbowKitConfig({
  appName: "My Custom App",
  projectId: "your-project-id",
  chains: [polygon, arbitrum]
});

// Custom Redux store
const customStore = createDelphinusStore({
  // Add other reducers
  ui: uiReducer,
  data: dataReducer
});
```

### Manual Setup (Advanced)

```tsx
import React from 'react';
import { 
  WagmiProvider, 
  QueryClientProvider, 
  RainbowKitProvider,
  Provider as ReduxProvider,
  createDelphinusRainbowKitConfig,
  createDelphinusStore,
  delphinusQueryClient
} from 'zkwasm-minirollup-browser';

function Main() {
  const wagmiConfig = createDelphinusRainbowKitConfig({
    appName: "My zkWasm App"
  });
  const store = createDelphinusStore();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={delphinusQueryClient}>
        <RainbowKitProvider>
          <ReduxProvider store={store}>
            <App />
          </ReduxProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
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
      <DelphinusProvider>
        <YourApp />
      </DelphinusProvider>
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
const status = useSelector(selectLoginStatus);
React.useEffect(() => {
  if (status === 'L1AccountError') {
    console.log('L1 connection failed, please retry');
  } else if (status === 'L2AccountError') {
    console.log('L2 login failed, please retry');
  }
}, [status]);
```

## 📄 License

MIT

## 🎉 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

For more detailed examples, see the [example](./example) directory.
