# zkWasm Mini Rollup - New Provider Pattern Example

This is a complete example application demonstrating how to use the new **Provider Design Pattern** in a zkWasm Mini Rollup project. The new pattern provides a unified interface for wallet connections and blockchain interactions.

## 🚀 New Features

- ✅ **Unified Provider Interface** - Single API for all wallet types and blockchain interactions
- ✅ **Automatic Environment Configuration** - Simplified environment variable handling across all React project types
- ✅ **Type-Safe Provider System** - Full TypeScript support with comprehensive type checking
- ✅ **Cross-Platform Compatibility** - Works with CRA, Next.js, Vite, and custom build tools
- ✅ **Runtime Configuration** - Support for both environment variables and runtime configuration
- ✅ **Error Handling & Validation** - Built-in validation and error handling for all configurations

## Architecture Overview

### Provider Pattern Benefits

The new Provider pattern replaces the previous scattered provider implementations with:

1. **Unified Interface**: All provider types implement the same `DelphinusProvider` interface
2. **Global Management**: Single `ProviderManager` handles all provider instances
3. **Type Safety**: Full TypeScript support with comprehensive type definitions
4. **Flexibility**: Support for different provider types through configuration

### Supported Provider Types

- **Browser Provider** (`browser`) - MetaMask and browser-based wallets
- **Rainbow Provider** (`rainbow`) - RainbowKit integration (optional)
- **Read-Only Provider** (`readonly`) - For read-only blockchain operations
- **Wallet Provider** (`wallet`) - Private key-based wallets

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

The new Provider pattern uses **unified environment variable naming** across all React project types:

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

## New Provider Pattern Usage

### Basic Configuration

The application automatically configures the provider on startup:

```typescript
import { setProviderConfig, withProvider, getEnvConfig } from 'zkwasm-minirollup-browser';

// Configure provider type
setProviderConfig({ type: 'browser' });

// Use provider for operations
const result = await withProvider(async (provider) => {
  return await provider.connect();
});
```

### Environment Configuration

```typescript
import { getEnvConfig, validateEnvConfig } from 'zkwasm-minirollup-browser';

// Get environment configuration
const config = getEnvConfig();

// Validate configuration
const validation = validateEnvConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Direct Provider Usage

```typescript
import { withProvider } from 'zkwasm-minirollup-browser';

// Sign a message
const signature = await withProvider(async (provider) => {
  return await provider.sign('Hello World!');
});

// Get network information
const networkInfo = await withProvider(async (provider) => {
  const networkId = await provider.getNetworkId();
  return { networkId: networkId.toString() };
});
```

## Feature Demonstration

### 1. Automatic Provider Configuration

- The app automatically detects and validates environment variables
- Shows configuration errors with helpful instructions if variables are missing
- Automatically configures the appropriate provider type

### 2. Wallet Connection with Provider Pattern

- Uses the unified provider interface for all wallet interactions
- Provides "Test Sign" and "Test Provider" buttons to demonstrate direct provider usage
- Shows provider status and configuration information

### 3. L1 Account Management

- Uses the new provider system for L1 account operations
- Automatic wallet connection and network switching
- Display account information and available functions

### 4. L2 Account Management

- L2 key generation using the provider's sign functionality
- Deterministic key pair generation from wallet signatures
- Display L2 public key, PID information, and capabilities

### 5. Deposit Operations

- Complete deposit flow using the new provider pattern
- Enhanced error handling and validation
- Real-time status updates and transaction tracking

## Technical Architecture

### Provider Interface

All providers implement the unified `DelphinusProvider` interface:

```typescript
interface DelphinusProvider {
  connect(): Promise<string>;
  close(): Promise<void>;
  getNetworkId(): Promise<bigint>;
  switchNet(chainId: number): Promise<void>;
  sign(message: string): Promise<string>;
  getJsonRpcSigner(): Promise<JsonRpcSigner>;
  getContractWithSigner(address: string, abi: any[]): Promise<Contract>;
  getContractWithoutSigner(address: string, abi: any[]): Promise<Contract>;
  subscribeEvent(contract: Contract, eventName: string, callback: Function): Promise<void>;
  onAccountChange(callback: (accounts: string[]) => void): Promise<void>;
}
```

### Environment Configuration

```typescript
interface EnvConfig {
  walletConnectId: string;
  mode: string;
  depositContract: string;
  tokenContract: string;
  chainId: string;
}
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

### State Management

Uses Redux Toolkit with the same state structure but enhanced provider integration:

```typescript
interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: L2AccountInfo;
  status: string;
}
```

## Migration from Old Pattern

### Key Changes

1. **Unified Imports**: All provider functionality imported from main package
2. **Automatic Configuration**: No need for manual provider setup
3. **Environment Variables**: Simplified to use only `REACT_APP_` prefix
4. **Error Handling**: Built-in validation and error reporting

### Breaking Changes

- Removed direct RainbowKit/Wagmi dependencies from main app
- Environment variable names standardized to `REACT_APP_` prefix
- Provider configuration now handled automatically

## Development Guide

### Adding Custom Provider Types

1. Implement the `DelphinusProvider` interface
2. Add the new type to `ProviderConfig`
3. Update the provider factory in `ProviderManager`

### Custom Configuration

```typescript
import { setProviderConfig } from 'zkwasm-minirollup-browser';

// Configure for read-only mode
setProviderConfig({
  type: 'readonly',
  providerUrl: 'https://your-rpc-endpoint.com'
});

// Configure for private key wallet
setProviderConfig({
  type: 'wallet',
  privateKey: 'your-private-key',
  chainId: 11155111
});
```

### Error Handling

```typescript
import { withProvider } from 'zkwasm-minirollup-browser';

try {
  const result = await withProvider(async (provider) => {
    return await provider.someOperation();
  });
} catch (error) {
  console.error('Provider operation failed:', error);
}
```

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   - Check that all required environment variables are set
   - Ensure variable names use the correct `REACT_APP_` prefix
   - Copy from `env.example` and modify values

2. **Provider Connection Fails**
   - Verify WalletConnect Project ID is correctly configured
   - Check that the browser wallet extension is installed and unlocked
   - Ensure the target chain is supported

3. **Environment Variables Not Loading**
   - Restart the development server after changing `.env` file
   - Check that variables use the correct `REACT_APP_` prefix
   - Verify `.env` file is in the correct directory

4. **TypeScript Errors**
   - Ensure you're importing types from the main package
   - Check that provider operations use the correct interface methods

### Getting Help

- Check the [Provider Pattern Documentation](../PROVIDER_PATTERN.md)
- Review the [Compatibility Guide](../COMPATIBILITY_GUIDE.md)
- Look at the example source code for implementation details

## Performance Notes

- Provider instances are cached and reused for better performance
- Environment configuration is validated once on startup
- Provider operations use the efficient `withProvider` pattern for resource management 