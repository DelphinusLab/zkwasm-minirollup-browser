# Delphinus Provider 设计模式

## 概述

新的 Provider 设计模式提供了一个统一的接口来管理不同的区块链连接方式，包括浏览器钱包（如 MetaMask）、RainbowKit、只读连接和私钥钱包连接。

## 核心概念

### 1. DelphinusProvider 接口

所有 Provider 都实现统一的 `DelphinusProvider` 接口：

```typescript
interface DelphinusProvider {
  // 基础连接方法
  connect(): Promise<string>;
  close(): void;
  
  // 网络相关
  getNetworkId(): Promise<bigint>;
  switchNet(chainHexId: string): Promise<void>;
  
  // 签名相关
  sign(message: string): Promise<string>;
  getJsonRpcSigner(): Promise<JsonRpcSigner>;
  
  // 合约相关
  getContractWithSigner(contractAddress: string, abi: InterfaceAbi): Promise<DelphinusContract>;
  getContractWithoutSigner(contractAddress: string, abi: InterfaceAbi): DelphinusContract;
  
  // 事件订阅
  subscribeEvent<T>(eventName: string, cb: (event: T) => unknown): void;
  onAccountChange<T>(cb: (account: string) => T): void;
}
```

### 2. Provider 配置

通过 `ProviderConfig` 接口配置 Provider：

```typescript
interface ProviderConfig {
  type: 'browser' | 'rainbow' | 'readonly' | 'wallet';
  providerUrl?: string;
  privateKey?: string;
  chainId?: number;
}
```

### 3. 全局 Provider 管理器

使用单例模式的 Provider 管理器来管理当前活跃的 Provider：

```typescript
// 设置 Provider 配置
setProviderConfig(config: ProviderConfig);

// 获取当前 Provider
const provider = await getProvider();

// 清理当前 Provider
clearProvider();
```

## Provider 类型

### 1. Browser Provider (MetaMask 等)

适用于浏览器环境，使用 MetaMask 等钱包扩展。

```typescript
import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';

// 设置浏览器 Provider
setProviderConfig({ type: 'browser' });

// 使用 Provider
const address = await withProvider(async (provider) => {
  return await provider.connect();
});

const signature = await withProvider(async (provider) => {
  return await provider.sign('Hello, Delphinus!');
});
```

### 2. RainbowKit Provider

适用于使用 RainbowKit 的 React 应用。

```typescript
import { useRainbowKitAdapter } from 'zkwasm-minirollup-browser';

function MyComponent() {
  const { 
    initializeRainbowProvider, 
    address, 
    isConnected 
  } = useRainbowKitAdapter();

  useEffect(() => {
    if (isConnected && address) {
      initializeRainbowProvider();
    }
  }, [isConnected, address]);

  // 使用 withProvider 函数
  const handleSign = async () => {
    const signature = await withProvider(async (provider) => {
      return await provider.sign('Hello from RainbowKit!');
    });
  };
}
```

### 3. Readonly Provider

适用于只读操作，不需要签名功能。

```typescript
import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';

// 设置只读 Provider
setProviderConfig({ 
  type: 'readonly', 
  providerUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID' 
});

// 获取网络信息
const networkId = await withProvider(async (provider) => {
  return await provider.getNetworkId();
});

// 获取合约实例（只读）
const contract = await withProvider(async (provider) => {
  return provider.getContractWithoutSigner(
    '0x1234567890123456789012345678901234567890',
    [] // ABI
  );
});
```

### 4. Wallet Provider

适用于有私钥的环境，如服务器端或测试环境。

```typescript
import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';

// 设置钱包 Provider
setProviderConfig({ 
  type: 'wallet', 
  providerUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
  privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
});

// 连接钱包
const address = await withProvider(async (provider) => {
  return await provider.connect();
});

// 签名消息
const signature = await withProvider(async (provider) => {
  return await provider.sign('Hello from wallet!');
});
```

## 核心函数

### withProvider

通用的 Provider 使用函数，替代了之前的 `withBrowserConnector`、`withReadOnlyConnector` 等函数：

```typescript
async function withProvider<T>(
  callback: (provider: DelphinusProvider) => Promise<T>
): Promise<T>
```

### 向后兼容性

为了保持向后兼容性，保留了旧的函数名：

```typescript
// 这些函数现在内部使用 withProvider
withBrowserConnector(callback);
withReadOnlyConnector(callback, providerUrl);
withDelphinusWalletConnector(callback, providerUrl, privateKey);
```

## 使用模式

### 1. 基本使用模式

```typescript
// 1. 设置 Provider 配置
setProviderConfig({ type: 'browser' });

// 2. 使用 withProvider 函数
const result = await withProvider(async (provider) => {
  // 在这里使用 provider
  const address = await provider.connect();
  const signature = await provider.sign('Hello');
  return { address, signature };
});
```

### 2. 动态切换 Provider

```typescript
// 切换到浏览器 Provider
setProviderConfig({ type: 'browser' });
const browserResult = await withProvider(async (provider) => {
  return await provider.connect();
});

// 切换到只读 Provider
setProviderConfig({ 
  type: 'readonly', 
  providerUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID' 
});
const readonlyResult = await withProvider(async (provider) => {
  return await provider.getNetworkId();
});
```

### 3. 错误处理

```typescript
try {
  setProviderConfig({ type: 'browser' });
  const result = await withProvider(async (provider) => {
    return await provider.connect();
  });
} catch (error) {
  console.error('Provider error:', error);
  
  // 清理并尝试其他 Provider
  clearProvider();
  setProviderConfig({ 
    type: 'readonly', 
    providerUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID' 
  });
}
```

## 优势

1. **统一接口**: 所有 Provider 都实现相同的接口，使用方式一致
2. **类型安全**: 完整的 TypeScript 类型支持
3. **易于扩展**: 可以轻松添加新的 Provider 类型
4. **向后兼容**: 保留了旧的 API，现有代码无需大幅修改
5. **全局管理**: 统一的 Provider 管理器，避免重复创建实例
6. **错误处理**: 统一的错误处理机制

## 迁移指南

### 从旧版本迁移

1. **替换 Provider 创建**:
   ```typescript
   // 旧版本
   const provider = new DelphinusBrowserConnector();
   
   // 新版本
   setProviderConfig({ type: 'browser' });
   const provider = await getProvider();
   ```

2. **替换 withXXX 函数**:
   ```typescript
   // 旧版本
   await withBrowserConnector(async (provider) => {
     // 使用 provider
   });
   
   // 新版本
   setProviderConfig({ type: 'browser' });
   await withProvider(async (provider) => {
     // 使用 provider
   });
   ```

3. **更新 RainbowKit 使用**:
   ```typescript
   // 旧版本
   const adapter = new RainbowKitAdapter();
   await adapter.initialize(address, chainId);
   
   // 新版本
   const { initializeRainbowProvider } = useRainbowKitAdapter();
   await initializeRainbowProvider();
   ```

## 注意事项

1. 使用 Provider 前必须先调用 `setProviderConfig`
2. 切换 Provider 类型时会自动清理旧的 Provider 实例
3. RainbowKit Provider 需要在使用前调用 `initialize` 方法
4. 只读 Provider 不支持签名相关操作
5. 钱包 Provider 需要提供私钥，请确保安全性 