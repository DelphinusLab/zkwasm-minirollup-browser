# zkWasm Mini Rollup - Split Hooks Architecture Example

This is a complete example application demonstrating the new **Split Hooks Architecture** in a zkWasm Mini Rollup project. The new architecture provides optimal performance through separation of connection state and wallet actions.

## Architecture Overview

### Split Hooks Benefits

The new architecture replaces the monolithic `useZkWasmWallet` with specialized hooks:

1. **`useConnection()`**: Provides connection state only
   - `isConnected`, `address`, `chainId`
   - Optimized for components that only need to display connection status
   - Minimal re-renders

2. **`useWalletActions(address, chainId)`**: Provides wallet operations
   - `connectAndLoginL1`, `loginL2`, `deposit`, `reset`
   - Depends on connection state parameters
   - Only used in components that perform actions

### Before vs After

```tsx
// ✅ New Approach - Split Hooks
const { isConnected, address, chainId } = useConnection();
const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
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

## Split Hooks Usage Examples

### Basic Implementation

```typescript
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useConnection,
  useWalletActions,
  type AccountState,
} from '../../src/index';

// Define Redux store's root state type
interface RootState {
  account: AccountState;
}

function WalletExample() {
  const dispatch = useDispatch();
  
  // Split hooks for optimal performance
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
  
  // Redux state
  const { l1Account, l2account, status } = useSelector((state: RootState) => state.account);
  
  // Derived states
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2account;
  const isL1Connecting = status === 'LoadingL1';
  const isL2Connecting = status === 'LoadingL2';
  const isDepositing = status === 'Deposit';

  const handleConnect = async () => {
    try {
      await connectAndLoginL1(dispatch);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleL2Login = async () => {
    try {
      await loginL2(dispatch, "MyApp");
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
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleReset = async () => {
    await reset(dispatch);
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
  // Split hooks
  useConnection,
  useWalletActions,
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
          <button onClick={() => connectAndLoginL1(dispatch)}>
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

### 2. Split Hooks Performance Benefits

Components only re-render when their specific data changes:

```typescript
// This component only re-renders when connection state changes
function ConnectionDisplay() {
  const { isConnected, address, chainId } = useConnection();
  
  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      Address: {address}
      Chain: {chainId}
    </div>
  );
}

// This component only re-renders when action dependencies change
function WalletActions() {
  const { isConnected, address, chainId } = useConnection();
  const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId);
  
  // Actions depend on connection state
  return (
    <div>
      <button onClick={() => connectAndLoginL1(dispatch)}>Connect L1</button>
      <button onClick={() => loginL2(dispatch, "MyApp")}>Login L2</button>
    </div>
  );
}
```

### 3. Wallet Connection State Management

The app demonstrates proper state management for wallet connections:

- **State Reset on Disconnect**: Automatically clears account state when wallet disconnects
- **Account Switching Detection**: Detects when user switches between wallet accounts
- **Auto-Login Logic**: Intelligently determines when to auto-login based on connection state

### 4. L1 & L2 Account Management

- **L1 Account**: Uses the wallet connection directly
- **L2 Account**: Generated from wallet signature using deterministic key derivation
- **State Synchronization**: Keeps Redux state in sync with wallet state

### 5. Enhanced Deposit Operations

- **Input Validation**: Validates deposit amount and account states
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Status Tracking**: Real-time status updates during deposit process

## Technical Architecture

### State Management Structure

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

### Hook Dependencies

```typescript
// useConnection - No dependencies
const { isConnected, address, chainId } = useConnection();

// useWalletActions - Requires connection state
const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
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

### Conditional Hook Usage

```typescript
// Only use wallet actions when connected
function ConditionalActions() {
  const { isConnected, address, chainId } = useConnection();
  
  // Only initialize wallet actions when connected
  const walletActions = isConnected 
    ? useWalletActions(address, chainId)
    : null;
  
  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }
  
  return (
    <button onClick={() => walletActions?.connectAndLoginL1(dispatch)}>
      Login L1
    </button>
  );
}
```

### Error Boundary Integration

```typescript
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Split hooks error:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return <div>Something went wrong with wallet connection.</div>;
  }
  
  return children;
}
```

### Custom Hook Composition

```typescript
// Create a custom hook that combines connection and actions
function useWalletState() {
  const connection = useConnection();
  const actions = useWalletActions(connection.address, connection.chainId);
  const accountState = useSelector((state: RootState) => state.account);
  
  return {
    ...connection,
    ...actions,
    ...accountState,
    isL1Connected: !!accountState.l1Account,
    isL2Connected: !!accountState.l2account,
  };
}
```

## Troubleshooting

### Common Issues

1. **Missing Hook Dependencies**
   ```typescript
   // ❌ Wrong - Missing dependencies
   const { connectAndLoginL1 } = useWalletActions();
   
   // ✅ Correct - With dependencies
   const { isConnected, address, chainId } = useConnection();
   const { connectAndLoginL1 } = useWalletActions(address, chainId);
   ```

2. **State Synchronization Issues**
   ```typescript
   // Monitor connection state changes
   useEffect(() => {
     console.log('Connection state:', { isConnected, address, chainId });
   }, [isConnected, address, chainId]);
   ```

3. **Provider Configuration Errors**
   ```typescript
   // Validate configuration before use
   const validation = validateEnvConfig();
   if (!validation.isValid) {
     console.error('Configuration errors:', validation.errors);
   }
   ```

For detailed performance metrics, run the example and monitor the React DevTools Profiler. 