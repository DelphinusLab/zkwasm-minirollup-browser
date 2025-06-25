# zkwasm-minirollup-browser

## Overview

This project provides a browser-based SDK for zkWasm Mini Rollup integration with wallet connection capabilities. It supports both traditional wallet connections and modern RainbowKit integration for enhanced user experience.

## Features

- **Multi-wallet Support**: Compatible with MetaMask, WalletConnect, Coinbase Wallet, and more through RainbowKit
- **L1/L2 Account Management**: Complete Ethereum mainnet and zkWasm Rollup account handling
- **Deposit Functionality**: Seamless token deposits from L1 to L2
- **Redux Integration**: Full state management with Redux Toolkit
- **TypeScript Support**: Complete type safety throughout the SDK
- **Modern UI**: Beautiful wallet connection experience with RainbowKit

## Environment Variables

Configure the following environment variables in your `.env` file:

```env
# WalletConnect Project ID (Required for RainbowKit)
# Get from: https://cloud.walletconnect.com/
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Target Chain ID (Optional, defaults to 1 - Ethereum Mainnet)
# Common Chain IDs:
# 1 = Ethereum Mainnet
# 11155111 = Sepolia Testnet  
# 137 = Polygon
# 42161 = Arbitrum One
# 8453 = Base
# 10 = Optimism
# 56 = BSC (Binance Smart Chain)
# 31337 = Localhost (Development)
REACT_APP_CHAIN_ID=1

# Contract Addresses (Configure according to your deployment)
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
```

**Note:** `REACT_APP_CHAIN_ID` determines which blockchain network the application will connect to. RainbowKit will only display the specified network to ensure users connect to the correct chain.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp example/env.example .env
   ```
   Then edit `.env` with your actual values.

3. **Get WalletConnect Project ID:**
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy the Project ID to your `.env` file

4. **Run the example:**
   ```bash
   npm run dev:example
   ```

## Installation & Integration

### For External Projects

Install the package:
```bash
npm install zkwasm-minirollup-browser
```

### Basic Setup

Wrap your app with the necessary providers:

```tsx
import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { Provider } from 'react-redux';
import { wagmiConfig } from 'zkwasm-minirollup-browser/src/wagmi-config';
import { store } from './your-redux-store';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Provider store={store}>
            {/* Your app components */}
          </Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Using the SDK

#### Simple Hook Usage

```tsx
import { useZkWasmWallet } from 'zkwasm-minirollup-browser';

function MyComponent() {
  const wallet = useZkWasmWallet();
  const { connectAndLoginL1, loginL2, deposit, reset } = wallet;

  return (
    <div>
      <button onClick={() => connectAndLoginL1(dispatch)}>
        Connect & Login L1
      </button>
      <button onClick={() => loginL2(dispatch)}>
        Generate L2 Keys
      </button>
      <button onClick={() => deposit(dispatch, params)}>
        Deposit to L2
      </button>
    </div>
  );
}
```

#### Redux Integration

```tsx
import { useDispatch } from 'react-redux';
import { 
  loginL1AccountWithRainbowKitAsync,
  loginL2AccountWithRainbowKitAsync,
  depositWithRainbowKitAsync 
} from 'zkwasm-minirollup-browser';

function LoginComponent() {
  const dispatch = useDispatch();
  const wallet = useZkWasmWallet();

  const handleL1Login = async () => {
    await dispatch(loginL1AccountWithRainbowKitAsync(wallet));
  };

  const handleL2Login = async () => {
    await dispatch(loginL2AccountWithRainbowKitAsync({
      appName: "0xAUTOMATA",
      rainbowKitHooks: wallet
    }));
  };

  const handleDeposit = async () => {
    await dispatch(depositWithRainbowKitAsync({
      tokenIndex: 0,
      amount: 1,
      l1account: l1Account,
      l2account: l2Account,
      rainbowKitHooks: wallet
    }));
  };

  return (
    <div>
      <button onClick={handleL1Login}>Login L1 Account</button>
      <button onClick={handleL2Login}>Login L2 Account</button>
      <button onClick={handleDeposit}>Deposit</button>
    </div>
  );
}
```

## Key Features

### L1/L2 Account System

**L1 Account:**
- Uses your wallet address directly
- Handles mainnet transactions and contract interactions
- Manages token approvals and deposits

**L2 Account:**
- Generated by signing fixed message "0xAUTOMATA"
- Creates deterministic key pair using Alt-BabyJubJub cryptography
- Produces PID[1] and PID[2] identifiers for L2 transactions

### Supported Networks

The SDK supports the following networks:
- Ethereum Mainnet (1)
- Sepolia Testnet (11155111)
- Polygon (137)
- Arbitrum One (42161)
- Base (8453)
- Optimism (10)
- BSC (56)
- Localhost (31337)

## API Reference

### Core Functions

- `useZkWasmWallet()` - Main hook providing all wallet functionality
- `connectAndLoginL1(dispatch)` - Connect wallet and login L1 account
- `loginL2(dispatch, appName?)` - Generate L2 key pair
- `deposit(dispatch, params)` - Deposit tokens from L1 to L2
- `reset(dispatch)` - Reset all account state

### Redux Actions

- `loginL1AccountWithRainbowKitAsync` - L1 account login
- `loginL2AccountWithRainbowKitAsync` - L2 key generation
- `depositWithRainbowKitAsync` - Token deposit
- `resetAccountState` - State reset

## Example Application

See the [example directory](./example/) for a complete working application demonstrating all features.

## Troubleshooting

### Common Issues

1. **WalletConnect Not Working**
   - Ensure `REACT_APP_WALLETCONNECT_PROJECT_ID` is correctly set
   - Get a valid Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)

2. **Network Switching Fails**
   - Check if target chain is supported by user's wallet
   - Verify `REACT_APP_CHAIN_ID` is set to a valid chain ID

3. **Contract Interaction Errors**
   - Ensure contract addresses are valid for the target network
   - Check that contracts exist and are properly deployed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
