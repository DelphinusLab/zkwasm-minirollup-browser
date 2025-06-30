# zkWasm Mini Rollup - Unified Wallet Context Example

This is a complete example application demonstrating the new **Unified Wallet Context Architecture** in a zkWasm Mini Rollup project. The new architecture provides optimal developer experience through a single hook that contains all wallet functionality.

## Architecture Overview

### Unified Context Benefits

The new architecture replaces complex hook combinations with a single `useWalletContext` hook:

1. **`useWalletContext()`**: Provides complete wallet functionality
   - Connection states: `isConnected`, `isL2Connected`, `address`, `chainId`
   - Account info: `l1Account`, `l2Account` (with all methods)
   - PID management: `playerId` array automatically calculated
   - Actions: `connectL1`, `connectL2`, `disconnect`
   - Zero dependencies required

2. **Advanced hooks** (optional): For users who need granular control
   - `useConnection()`: Connection state only
   - `useWalletActions(address, chainId)`: Wallet operations
   - Direct Redux access via `useSelector`

### Before vs After

```tsx
// ✅ New Approach - Unified Context (Recommended)
const {
  isConnected, isL2Connected, l1Account, l2Account, playerId,
  address, chainId, connectL1, connectL2, disconnect
} = useWalletContext();

// 🔧 Advanced Approach - Split Hooks (Optional)
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
```

## Quick Start

### 1. Install Dependencies

Run from the project root directory:

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment variables file:

```bash
cp example/env.example example/.env
```

Configure the following variables in `example/.env`:

```env
# WalletConnect Project ID (Required)
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Target Chain ID (Required)
REACT_APP_CHAIN_ID=11155111

# Contract Addresses (Required)
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
```

#### Environment Variable Naming

The architecture uses **unified environment variable naming** across all React project types:

- **All projects use `REACT_APP_` prefix** - Works with CRA, Next.js, Vite, and custom builds
- **Automatic fallback** - Falls back to global variables if environment variables are not available
- **Runtime configuration** - Supports setting configuration at runtime

#### Chain ID Configuration

Common Chain IDs:
- `1` - Ethereum Mainnet
- `11155111` - Sepolia Testnet  
- `137` - Polygon
- `42161` - Arbitrum One
- `8453` - Base
- `10` - Optimism
- `56` - BSC (Binance Smart Chain)
- `31337` - Localhost (Development Environment)

### 3. Get WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID to your environment variables

### 4. Start Development Server

```bash
npm run dev:example
```

The application will start at `http://localhost:5173`.

## Unified Context Usage Examples

### Basic Implementation

```typescript
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useWalletContext,
  type AccountState,
} from '../../src/index';

// Define Redux store's root state type
interface RootState {
  account: AccountState;
}

function WalletExample() {
  const dispatch = useDispatch();
  
  // Unified context for optimal performance
  const {
    isConnected, isL2Connected, l1Account, l2Account, playerId,
    address, chainId, connectL1, connectL2, disconnect
  } = useWalletContext();
  
  // Redux state
  const { l1Account: reduxL1Account, l2Account: reduxL2Account, status } = useSelector((state: RootState) => state.account);
  
  // Derived states
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2Account;
  const isL1Connecting = status === 'LoadingL1';
  const isL2Connecting = status === 'LoadingL2';
  const isDepositing = status === 'Deposit';

  const handleConnect = async () => {
    try {
      await connectL1(dispatch);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleL2Login = async () => {
    try {
      await connectL2(dispatch, "MyApp");
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
      await connectL2(dispatch, {
        tokenIndex: 0,
        amount: 0.01,
        l1account: l1Account,
        l2account: l2Account
      });
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleReset = async () => {
    await disconnect(dispatch);
  };

  return (
    <div>
      {/* Connection Status Display */}
      <div className="status-section">
        <h3>Connection Status</h3>
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Address: {address || 'Not connected'}</p>
        <p>Chain ID: {chainId || 'Unknown'}</p>
        <p>Status: {status}</p>
      </div>

      {/* Action Buttons */}
      <div className="actions-section">
        {!isConnected ? (
          <button onClick={handleConnect} disabled={isL1Connecting}>
            {isL1Connecting ? 'Connecting...' : 'Connect Wallet & Login L1'}
          </button>
        ) : (
          <div>
            {isL1Connected && !isL2Connected && (
              <button onClick={handleL2Login} disabled={isL2Connecting}>
                {isL2Connecting ? 'Logging in L2...' : 'Login L2'}
              </button>
            )}
            
            {isL1Connected && isL2Connected && (
              <button onClick={handleDeposit} disabled={isDepositing}>
                {isDepositing ? 'Depositing...' : 'Deposit 0.01 ETH'}
              </button>
            )}
            
            <button onClick={handleReset}>Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### RainbowKit Integration

```typescript
import React from 'react';
import {
  // RainbowKit components from SDK
  ConnectButton,
  useConnectModal,
  // Unified context
  useWalletContext,
} from '../../src/index';

function RainbowKitIntegration() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1 } = useWalletActions(address, chainId);

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
          <button onClick={() => connectL1(dispatch)}>
            Login L1 Account
          </button>
        </div>
      )}
    </div>
  );
}
```

## Feature Demonstration

### 1. Automatic Environment Configuration & Validation

The app automatically detects and validates environment variables on startup:

```typescript
// Validate environment configuration
const validation = validateEnvConfig();
if (!validation.isValid) {
  setConfigErrors(validation.errors);
} else {
  setConfigErrors([]);
  // Set Provider configuration
  setProviderConfig({ type: 'rainbow' });
}
```

### 2. Unified Context Performance Benefits

Single hook provides all wallet functionality with optimized internal state management:

```typescript
// This component gets all wallet functionality from one hook
function WalletDisplay() {
  const {
    isConnected, isL2Connected, l1Account, l2Account, playerId,
    address, chainId, connectL1, connectL2, disconnect
  } = useWalletContext();
  
  return (
    <div>
      <p>Status: L1 {isConnected ? '✅' : '❌'} | L2 {isL2Connected ? '✅' : '❌'}</p>
      <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
      <p>Address: {address}</p>
      <p>Chain: {chainId}</p>
      
      <button onClick={connectL1}>Connect L1</button>
      <button onClick={connectL2}>Connect L2</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### 3. Wallet Connection State Management

The app demonstrates proper state management for wallet connections:

- **Unified State**: All wallet state managed internally by `useWalletContext`
- **Account Switching Detection**: Automatically detects wallet account changes
- **Auto-State Updates**: Context automatically updates when underlying state changes

### 4. L1 & L2 Account Management with PID

- **L1 Account**: Direct wallet connection information
- **L2 Account**: Generated from wallet signature with full L2AccountInfo instance
- **Player ID (PID)**: Automatically calculated array from L2 account
- **State Synchronization**: Context keeps all state synchronized

### 5. Enhanced Account Operations

- **L2 Account Methods**: Access all L2AccountInfo methods directly from context
- **PID Management**: Player ID automatically updated when L2 account changes
- **Serialization**: Full support for L2 account serialization/deserialization

## Technical Architecture

### State Management Structure

```typescript
// Unified Context provides all of this internally
interface WalletContextType {
  isConnected: boolean;
  isL2Connected: boolean;
  l1Account: any;
  l2Account: any;
  playerId: [string, string] | null;
  address: string | undefined;
  chainId: number | undefined;
  connectL1: () => Promise<void>;
  connectL2: () => Promise<void>;
  disconnect: () => void;
  setPlayerId: (id: [string, string]) => void;
}

// Advanced users can still access Redux state directly
interface AccountState {
  l1Account?: L1AccountInfo;
  l2Account?: L2AccountInfo;
  status: 'Initial' | 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
}

interface RootState {
  account: AccountState;
}
```

### Hook Dependencies

```typescript
// useWalletContext - No dependencies required (Recommended)
const walletContext = useWalletContext();

// Advanced hooks - Require dependencies
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
```

### Provider Configuration

```typescript
interface ProviderConfig {
  type: 'browser' | 'rainbow' | 'readonly' | 'wallet';
  providerUrl?: string;
  privateKey?: string;
  chainId?: number;
}
```

## Advanced Usage Patterns

### Unified Context with Direct L2 Account Access

```typescript
function AdvancedL2Operations() {
  const { l2Account, playerId } = useWalletContext();

  const handleL2Operations = React.useCallback(() => {
    if (!l2Account) return;

    // Access all L2AccountInfo methods directly
    const serialized = l2Account.toSerializableData();
    const [pid1, pid2] = l2Account.getPidArray();
    const pubkeyHex = l2Account.toHexStr();

    console.log('L2 Account Operations:', {
      serialized,
      pidArray: [pid1.toString(), pid2.toString()],
      pubkeyHex,
      contextPlayerId: playerId
    });
  }, [l2Account, playerId]);

  return (
    <div>
      <button onClick={handleL2Operations}>
        Perform L2 Operations
      </button>
    </div>
  );
}
```

### Conditional Context Usage

```typescript
// Use context conditionally based on component needs
function ConditionalWallet() {
  const { isConnected, connectL1 } = useWalletContext();
  
  if (!isConnected) {
    return <button onClick={connectL1}>Connect Wallet</button>;
  }
  
  return <ConnectedWalletView />;
}

function ConnectedWalletView() {
  // Only use full context when connected
  const { 
    isL2Connected, l1Account, l2Account, playerId, 
    connectL2, disconnect 
  } = useWalletContext();
  
  return (
    <div>
      <p>L1 Account: {l1Account?.address}</p>
      <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
      
      {!isL2Connected ? (
        <button onClick={connectL2}>Connect L2</button>
      ) : (
        <p>L2 Connected: {l2Account?.toHexStr()}</p>
      )}
      
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### Error Boundary Integration

```typescript
function WalletErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Wallet context error:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return (
      <div>
        <h3>Wallet Connection Error</h3>
        <p>Something went wrong with the wallet connection.</p>
        <button onClick={() => setHasError(false)}>Retry</button>
      </div>
    );
  }
  
  return children;
}
```

### Mixing Unified Context with Advanced Hooks

```typescript
// Use unified context for most functionality, advanced hooks for special cases
function HybridWalletComponent() {
  const dispatch = useDispatch();
  
  // Unified context for most functionality
  const {
    isConnected, isL2Connected, l1Account, l2Account, playerId,
    address, chainId, connectL1, connectL2, disconnect
  } = useWalletContext();
  
  // Advanced hooks for special operations requiring dispatch
  const { deposit, reset } = useWalletActions(address, chainId);
  
  // Direct Redux state for status monitoring
  const { status } = useSelector((state: RootState) => state.account);

  const handleDeposit = async () => {
    if (!isL2Connected) {
      alert('Please connect L2 first');
      return;
    }

    try {
      await deposit(dispatch, {
        tokenIndex: 0,
        amount: 0.01,
        l1account: l1Account,
        l2account: l2Account
      });
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  return (
    <div>
      <p>Status: {status}</p>
      <p>L1: {isConnected ? '✅' : '❌'} | L2: {isL2Connected ? '✅' : '❌'}</p>
      <p>Player ID: {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
      
      <button onClick={connectL1}>Connect L1</button>
      <button onClick={connectL2}>Connect L2</button>
      <button onClick={handleDeposit}>Deposit</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Missing Context Provider**
   ```typescript
   // ❌ Wrong - useWalletContext used outside provider
   function App() {
     const wallet = useWalletContext(); // Error!
     return <div>...</div>;
   }
   
   // ✅ Correct - Wrapped in provider
   function App() {
     return (
       <DelphinusReactProvider>
         <WalletComponent />
       </DelphinusReactProvider>
     );
   }
   ```

2. **PID Consistency Issues**
   ```typescript
   // Monitor PID consistency
   const { l2Account, playerId } = useWalletContext();
   
   React.useEffect(() => {
     if (l2Account && playerId) {
       const [pid1, pid2] = l2Account.getPidArray();
       const matches = 
         playerId[0] === pid1.toString() && 
         playerId[1] === pid2.toString();
       
       if (!matches) {
         console.warn('PID mismatch detected');
       }
     }
   }, [l2Account, playerId]);
   ```

3. **Provider Configuration Errors**
   ```typescript
   // Validate configuration before use
   const validation = validateEnvConfig();
   if (!validation.isValid) {
     console.error('Configuration errors:', validation.errors);
   }
   ```

For performance metrics and debugging, use React DevTools Profiler to monitor component re-renders. 