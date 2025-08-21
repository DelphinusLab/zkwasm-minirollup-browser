# zkWasm Mini Rollup Browser SDK

A modern, production-ready SDK for zkWasm Mini Rollup integration with **unified wallet context API**, supporting Layer 2 account management, multi-wallet providers, and blockchain interactions.

## 🚀 Key Features

- **🎯 Unified Wallet Context** - Single `useWalletContext` hook provides complete L1 + L2 wallet functionality
- **⚡ Layer 2 Integration** - Seamless L1→L2 account derivation via app-specific signatures
- **🎨 Modern UI Integration** - RainbowKit components with mobile wallet optimization
- **🛡️ Production Ready** - Advanced session recovery, error handling, and state management
- **🔧 Environment Management** - Unified configuration with dotenv support across all project types
- **🌐 Multi-Wallet Support** - MetaMask, WalletConnect, Rainbow, and 20+ wallet providers
- **🎯 Type Safety** - Full TypeScript support with comprehensive type definitions
- **⚡ Performance Optimized** - Proactive monitoring, adaptive polling, and resource cleanup

## 📋 Quick Start

### 1. Install the SDK

```bash
npm install zkwasm-minirollup-browser
```

### 2. Setup Provider & Configuration

#### Option A: Complete Setup (Recommended for new projects)

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DelphinusReactProvider, setProviderConfig } from 'zkwasm-minirollup-browser';
import App from './App';

// Configure provider before rendering
setProviderConfig({ type: 'rainbow' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DelphinusReactProvider appName="zkWasm Staking Platform">
      <App />
    </DelphinusReactProvider>
  </React.StrictMode>,
);
```

#### Option B: Existing Apps Integration

```tsx
// App.tsx
import { DelphinusReactProvider, setProviderConfig, validateEnvConfig } from 'zkwasm-minirollup-browser';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Validate environment
    const validation = validateEnvConfig();
    if (!validation.isValid) {
      console.warn('Environment validation failed:', validation.errors);
    }
    
    // Configure provider
    setProviderConfig({ type: 'rainbow' });
  }, []);

  return (
    <DelphinusReactProvider appName="My zkWasm App">
      <YourAppContent />
    </DelphinusReactProvider>
  );
}
```

> **🔑 Critical: App Name = L2 Signature Message**
> 
> The `appName` is **the exact message users sign** to generate their L2 account:
> - ✅ `"zkWasm Staking Platform"` → User signs this in their wallet
> - ✅ Same `appName` = Same L2 account for user across sessions
> - ❌ Change `appName` = New L2 account (loses previous data)
> - 🎯 Choose a **permanent, unique** name for your application

### 3. Use the Unified Wallet Context

```tsx
// components/WalletButton.tsx
import { useWalletContext, useConnectModal } from 'zkwasm-minirollup-browser';

function WalletButton() {
  const {
    isConnected, isL2Connected, address, playerId,
    connectL2, disconnect
  } = useWalletContext();
  
  const { openConnectModal } = useConnectModal();

  const handleConnect = async () => {
    try {
      if (!isConnected) {
        // Open RainbowKit modal for L1 connection
        openConnectModal?.();
      } else if (!isL2Connected) {
        // Connect L2 account (user signs app name)
        await connectL2();
        console.log('L2 account connected successfully');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      
      // Handle SDK error codes
      if (error.code === 'SESSION_EXPIRED') {
        disconnect(); // SDK auto-cleared session
      } else if (error.message?.includes('User rejected')) {
        console.log('User cancelled connection');
      } else {
        alert(`Connection failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="wallet-status">
      {/* Connection Status */}
      <div>
        <span>L1: {isConnected ? '✅' : '❌'}</span>
        <span>L2: {isL2Connected ? '✅' : '❌'}</span>
        {playerId && <span>Player: [{playerId[0]}, {playerId[1]}]</span>}
      </div>
      
      {/* Action Buttons */}
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : !isL2Connected ? (
        <button onClick={handleConnect}>Connect L2 (Sign App Name)</button>
      ) : (
        <div>
          <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

### 4. Environment Configuration

Create a `.env` file in your project root:

```env
# Required Configuration  
REACT_APP_CHAIN_ID=11155111
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional Configuration
REACT_APP_URL=https://your-api-endpoint.com
REACT_APP_MODE=development
```

> **📋 Environment Notes**:
> - SDK uses **unified `REACT_APP_` prefix** for all project types (CRA, Next.js, Vite)
> - **WalletConnect Project ID** is required for mobile wallet support
> - Get your Project ID at: https://cloud.walletconnect.com/
> - SDK includes built-in **security validation** for all environment variables

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

### Complete Wallet Integration Example

Based on the actual implementation in our example app:

```tsx
// contexts/WalletContext.tsx - Simple re-export pattern
import { useWalletContext, type WalletContextType } from 'zkwasm-minirollup-browser';

// Re-export for consistent naming in your app
export const useWallet = useWalletContext;
export type { WalletContextType };
```

```tsx
// components/Header.tsx - Real-world wallet button implementation
import { useWallet } from '@/contexts/WalletContext';
import { useConnectModal } from 'zkwasm-minirollup-browser';

export const Header = () => {
  const { 
    isConnected, 
    isL2Connected, 
    address, 
    playerId,
    connectL2,
    disconnect
  } = useWallet();
  
  const { openConnectModal } = useConnectModal();

  const handleWalletClick = async () => {
    try {
      if (!isConnected) {
        // Open RainbowKit modal for L1 connection
        openConnectModal?.();
      } else if (!isL2Connected) {
        // Connect L2 account (signs app name)
        await connectL2();
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      // Handle SDK-specific error codes
      if (error?.code === 'SESSION_EXPIRED') {
        disconnect(); // SDK already cleared session
      } else if (error?.message?.includes('User rejected')) {
        console.log('User cancelled connection');
      } else {
        alert(`Connection failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <header>
      {isConnected ? (
        <div className="wallet-info">
          {/* Connection Status Indicator */}
          <div className="status-indicator">
            <span className={isL2Connected ? 'connected' : 'warning'}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            {isL2Connected && playerId && (
              <span className="l2-badge">L2 Connected</span>
            )}
          </div>
          
          {/* L2 Connect Button */}
          {!isL2Connected && (
            <button onClick={async () => {
              try {
                await connectL2();
              } catch (error: any) {
                if (error?.code === 'SESSION_EXPIRED') {
                  disconnect();
                } else {
                  alert(`L2 connection failed: ${error?.message}`);
                }
              }
            }}>
              Connect L2
            </button>
          )}
        </div>
      ) : (
        <button onClick={handleWalletClick}>
          Connect Wallet
        </button>
      )}
    </header>
  );
};
```

### zkWasm Transactions Example

```tsx
// services/stakingService.ts - Real zkWasm operations
import { createCommand } from 'zkwasm-minirollup-rpc';

export class StakingService {
  // Install player (L2 account setup)
  async installPlayer(l2PrivateKey: string) {
    const installCmd = createCommand(1, [], l2PrivateKey); // Command 1 = Install Player
    
    // Send to zkWasm RPC
    const result = await fetch(`${API_BASE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cmd: Array.from(installCmd),
        prikey: l2PrivateKey 
      })
    });
    
    return result.json();
  }
  
  // Deposit ETH to L2
  async depositToL2(amount: bigint, l2PrivateKey: string) {
    const depositCmd = createCommand(3, [amount], l2PrivateKey); // Command 3 = Deposit
    
    const result = await fetch(`${API_BASE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: Array.from(depositCmd),
        prikey: l2PrivateKey
      })
    });
    
    return result.json();
  }
}

// Component using the service
function StakingForm() {
  const { l2Account, isL2Connected, deposit } = useWallet();
  
  const handleStake = async (amount: number) => {
    if (!isL2Connected || !l2Account) {
      alert('Please connect L2 account first');
      return;
    }
    
    try {
      // Step 1: L1 deposit (handled by SDK)
      await deposit({ tokenIndex: 0, amount });
      
      // Step 2: L2 staking operation
      const stakingService = new StakingService();
      await stakingService.depositToL2(
        BigInt(amount * 10**18), 
        l2Account.getPrivateKey()
      );
      
      alert('Staking successful!');
    } catch (error) {
      console.error('Staking failed:', error);
      alert(`Staking failed: ${error.message}`);
    }
  };
  
  return (
    <div>
      <input type="number" placeholder="Amount to stake" />
      <button onClick={() => handleStake(0.01)}>
        Stake 0.01 ETH
      </button>
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
      // ✅ useWalletActions requires dispatch parameter
      const result = await connectAndLoginL1(dispatch);
      console.log('Connected successfully!', result);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleL2Login = async () => {
    try {
      // ✅ useWalletActions requires dispatch + messageToSign
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
      // ✅ useWalletActions requires dispatch + full params
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

## 🔍 Troubleshooting & Error Handling

### Production-Ready Error Handling

The SDK provides comprehensive error handling with specific error codes:

```tsx
// Standard error handling pattern from example app
import { useWalletContext, useConnectModal } from 'zkwasm-minirollup-browser';

function WalletComponent() {
  const { isConnected, isL2Connected, connectL2, disconnect } = useWalletContext();
  const { openConnectModal } = useConnectModal();

  const handleWalletAction = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
      } else if (!isL2Connected) {
        await connectL2();
      }
    } catch (error: any) {
      console.error('Wallet action failed:', error);
      
      // Handle SDK-specific error codes
      if (error?.code === 'SESSION_EXPIRED') {
        // SDK automatically cleared invalid session
        disconnect();
        alert('Session expired. Please reconnect your wallet.');
      } else if (error?.code === 'SESSION_MISMATCH') {
        // Session validation failed
        disconnect(); 
        alert('Wallet session mismatch. Please reconnect.');
      } else if (error?.message?.includes('User rejected') || 
                 error?.message?.includes('User cancelled')) {
        // User cancelled - no error alert needed
        console.log('User cancelled wallet operation');
      } else if (error?.message?.includes('WalletConnect')) {
        // WalletConnect specific errors
        alert('Mobile wallet connection failed. Please try again.');
      } else {
        // Generic error handling
        alert(`Connection failed: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <button onClick={handleWalletAction}>
      {!isConnected ? 'Connect Wallet' : !isL2Connected ? 'Connect L2' : 'Connected'}
    </button>
  );
}
```

### Common Issues & Solutions

#### 1. Environment Configuration Issues
```tsx
import { validateEnvConfig, getEnvConfig } from 'zkwasm-minirollup-browser';

// App startup validation
function App() {
  useEffect(() => {
    // Validate environment
    const validation = validateEnvConfig();
    if (!validation.isValid) {
      console.error('❌ Environment validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      
      // Show user-friendly error
      alert('Configuration error. Please check your .env file.');
      return;
    }
    
    // Log successful config (for debugging)
    const config = getEnvConfig();
    console.log('✅ Environment validated:', {
      chainId: config.chainId,
      hasWalletConnect: !!config.walletConnectId,
      hasContracts: !!(config.depositContract && config.tokenContract)
    });
  }, []);

  return <YourApp />;
}
```

#### 2. WalletConnect & Mobile Wallet Issues
```tsx
// Mobile wallet troubleshooting
const handleMobileWalletIssues = (error: any) => {
  if (error?.message?.includes('session_request') && 
      error?.message?.includes('without any listeners')) {
    // SDK automatically handles this - just inform user
    console.log('🔄 WalletConnect session expired, cleared automatically');
    alert('Mobile wallet session expired. Please reconnect.');
    return true;
  }
  
  if (error?.message?.includes('No matching session')) {
    console.log('🔄 No active WalletConnect session found');
    alert('Please open your mobile wallet and try connecting again.');
    return true;
  }
  
  return false; // Not a WalletConnect error
};
```

#### 3. L2 Account & zkWasm Errors
```tsx
// zkWasm-specific error handling
import { StakingError } from '@/services/stakingService';

const handleZkWasmOperation = async () => {
  try {
    await stakingService.performOperation();
  } catch (error) {
    if (error instanceof StakingError) {
      // Handle specific zkWasm errors
      switch (error.code) {
        case 20:
          alert('Player not found. Please install player first.');
          break;
        case 21:
          alert('Insufficient stake. Please deposit more funds.');
          break;
        case 31:
          alert('Insufficient points for this operation.');
          break;
        default:
          alert(`zkWasm error: ${error.message}`);
      }
    } else {
      alert(`Operation failed: ${error.message}`);
    }
  }
};
```

#### 4. Network & Provider Issues
```tsx
// Network validation and switching
const handleNetworkIssues = async () => {
  const { chainId } = useWalletContext();
  const expectedChainId = parseInt(process.env.REACT_APP_CHAIN_ID || '11155111');
  
  if (chainId !== expectedChainId) {
    try {
      // SDK automatically handles network switching
      alert(`Wrong network. Please switch to chain ID ${expectedChainId}`);
    } catch (networkError) {
      console.error('Network switch failed:', networkError);
      alert('Failed to switch network. Please manually switch in your wallet.');
    }
  }
};
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

#### API Differences: useWalletContext vs useWalletActions
```tsx
// ✅ RECOMMENDED: useWalletContext (No dispatch needed)
const { connectL1, connectL2, deposit } = useWalletContext();

await connectL1();     // ✅ No parameters needed
await connectL2();     // ✅ Uses appName from Provider automatically  
await deposit({ tokenIndex: 0, amount: 0.01 }); // ✅ Simple parameters

// ⚠️ ADVANCED: useWalletActions (Requires dispatch)
const dispatch = useDispatch();
const { connectAndLoginL1, loginL2, deposit } = useWalletActions(address, chainId);

await connectAndLoginL1(dispatch);           // ❗ Requires dispatch
await loginL2(dispatch, "Custom Message");   // ❗ Requires dispatch + custom message
await deposit(dispatch, { tokenIndex: 0, amount: 0.01, l1account, l2account }); // ❗ Full params

// ❌ Wrong - Missing dependencies for useWalletActions
const { connectAndLoginL1 } = useWalletActions(); // Missing address, chainId
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
      <DelphinusReactProvider appName="Your App Name">
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

## 🎉 Complete Example

Here's a complete minimal example based on our production-ready demo:

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DelphinusReactProvider, setProviderConfig } from 'zkwasm-minirollup-browser';
import App from './App';
import './index.css';

setProviderConfig({ type: 'rainbow' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DelphinusReactProvider appName="My zkWasm DApp">
      <App />
    </DelphinusReactProvider>
  </React.StrictMode>,
);
```

```tsx
// App.tsx
import { useWalletContext, useConnectModal } from 'zkwasm-minirollup-browser';

function App() {
  const { 
    isConnected, 
    isL2Connected, 
    address, 
    playerId, 
    connectL2, 
    disconnect, 
    deposit 
  } = useWalletContext();
  
  const { openConnectModal } = useConnectModal();

  const handleConnect = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
      } else if (!isL2Connected) {
        await connectL2();
      }
    } catch (error: any) {
      if (error?.code === 'SESSION_EXPIRED') {
        disconnect();
      } else if (!error?.message?.includes('User')) {
        alert(`Connection failed: ${error?.message}`);
      }
    }
  };

  const handleDeposit = async () => {
    try {
      await deposit({ tokenIndex: 0, amount: 0.01 });
      alert('Deposit successful!');
    } catch (error: any) {
      alert(`Deposit failed: ${error?.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>zkWasm DApp</h1>
      
      <div>
        <p>L1: {isConnected ? '✅' : '❌'}</p>
        <p>L2: {isL2Connected ? '✅' : '❌'}</p>
        {address && <p>Address: {address.slice(0, 6)}...{address.slice(-4)}</p>}
        {playerId && <p>Player ID: [{playerId[0]}, {playerId[1]}]</p>}
      </div>
      
      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleConnect}>
          {!isConnected ? 'Connect Wallet' : !isL2Connected ? 'Connect L2' : 'Connected'}
        </button>
        
        {isL2Connected && (
          <button onClick={handleDeposit} style={{ marginLeft: '1rem' }}>
            Deposit 0.01 ETH
          </button>
        )}
        
        {isConnected && (
          <button onClick={disconnect} style={{ marginLeft: '1rem' }}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
```

```bash
# .env
REACT_APP_CHAIN_ID=11155111
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

---

## 📚 Resources

- **[Complete Example App](./example)** - Full-featured staking platform
- **[API Documentation](./src)** - Detailed SDK source code
- **[WalletConnect Setup](https://cloud.walletconnect.com/)** - Get your Project ID
- **[zkWasm Documentation](https://docs.zkwasm.com/)** - Learn about zkWasm technology

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

## 🔧 Project Setup & Build Configuration

### Webpack/CRA Configuration

For Create React App or webpack-based projects, you'll need to configure Node.js polyfills:

```bash
# Install required dependencies
npm install --save-dev react-app-rewired
npm install buffer crypto-browserify stream-browserify process util path-browserify os-browserify
```

```javascript
// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config, env) {
  // Node.js polyfills for Web3 libraries
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser"),
    "util": require.resolve("util"),
    "path": require.resolve("path-browserify"),
    "os": require.resolve("os-browserify/browser")
  });
  config.resolve.fallback = fallback;
  
  // Global providers
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ]);

  return config;
};
```

```json
// package.json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "test": "react-app-rewired test"
  }
}
```

### Vite Configuration

For Vite projects (recommended for new projects):

```bash
# Install Vite polyfills
npm install --save-dev vite-plugin-node-polyfills
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      include: ['crypto', 'stream', 'buffer', 'process', 'util', 'path', 'os']
    })
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### Environment Setup

```bash
# .env
REACT_APP_CHAIN_ID=11155111
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
REACT_APP_URL=https://your-api-endpoint.com
REACT_APP_MODE=development
```

## WalletConnect / Mobile Wallet Support

This SDK provides enhanced support for mobile wallets and WalletConnect with automatic session recovery.

### Key Features

- **Automatic Session Recovery**: WalletConnect sessions are automatically restored after page refresh or mobile app switching
- **Enhanced Error Handling**: Clear error messages help users understand connection issues
- **Mobile-Optimized**: Designed to work seamlessly with mobile wallet apps

### Usage

```tsx
import { DelphinusProvider } from 'zkwasm-minirollup-browser';

function App() {
  return (
    <DelphinusProvider appName="Your App Name">
      <YourAppContent />
    </DelphinusProvider>
  );
}
```

### Mobile Wallet Flow

1. **Connect L1**: User connects their wallet (MetaMask, WalletConnect, etc.)
2. **App Switching**: User may switch to wallet app for signing
3. **Auto Recovery**: When returning to your app, the connection is automatically restored
4. **Connect L2**: User can then connect to L2 without re-connecting L1

### Troubleshooting

#### "No Ethereum Provider Found" Error

This error typically occurs on mobile when:
- The page refreshed after wallet switching
- WalletConnect session was lost
- Provider configuration is missing

**Solutions:**
1. Ensure your app is wrapped with `DelphinusProvider`
2. The SDK will automatically attempt to reconnect
3. If auto-reconnection fails, the user will be prompted to reconnect

#### Session Recovery

The SDK automatically handles session recovery by:
- Checking for existing wagmi connections on initialization
- Attempting to reconnect WalletConnect sessions
- Falling back to manual connection if needed

### Configuration

```tsx
<DelphinusProvider
  appName="Your App Name"
  projectId="your-walletconnect-project-id" // Optional, will use env var if not provided
  chains={[sepolia]} // Optional, defaults based on REACT_APP_CHAIN_ID
>
  <App />
</DelphinusProvider>
```

### Environment Variables

```bash
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id
REACT_APP_CHAIN_ID=11155111  # Sepolia testnet
```
