import { DelphinusRainbowConnector, setProviderConfig, clearProvider } from './provider.js';

// React Hook：用于获取 RainbowKit 适配器实例
// 注意：此函数需要在有 wagmi providers 的环境中使用
export function useRainbowKitAdapter() {
  // 这个函数需要外部项目提供 wagmi hooks
  // 新的 Provider 模式项目应该直接使用 setProviderConfig({ type: 'rainbow' })
  
  throw new Error(`
    useRainbowKitAdapter requires wagmi providers to be set up.
    
    For new projects, please use the Provider pattern instead:
    
    import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';
    
    // Configure rainbow provider
    setProviderConfig({ type: 'rainbow' });
    
    // Use provider
    const result = await withProvider(async (provider) => {
      return await provider.connect();
    });
    
    For legacy projects with wagmi setup, you can create this hook manually:
    
    import { useAccount, useChainId, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
    import { useConnectModal } from '@rainbow-me/rainbowkit';
    
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    // ... etc
  `);
}

// 兼容性函数：模拟原有的 withRainbowKitConnector 函数
export async function withRainbowKitConnector<T>(
  cb: (provider: any) => Promise<T>,
  rainbowKitHooks: any
): Promise<T> {
  try {
    // 设置 provider 配置
    setProviderConfig({ type: 'rainbow' });
    
    // 获取 provider 实例
    const { getProvider } = await import('./provider.js');
    const provider = await getProvider();
    
    // 如果是 RainbowKit provider，需要初始化
    if (provider instanceof DelphinusRainbowConnector && rainbowKitHooks.isConnected && rainbowKitHooks.address) {
      await provider.initialize(rainbowKitHooks.address, rainbowKitHooks.chainId);
    }
    
    // 执行回调函数
    return await cb(provider);
  } catch (e) {
    throw e;
  }
}

// 添加一个方法来重新初始化适配器
export async function reinitializeRainbowProvider(address: string, chainId: number) {
  // 清理旧的连接
  clearProvider();
  
  // 重新设置配置
  setProviderConfig({ type: 'rainbow' });
  
  // 获取新的 provider 实例并初始化
  const { getProvider } = await import('./provider.js');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// 新的 Provider 模式适配器函数
export async function initializeRainbowProvider(address: string, chainId: number) {
  setProviderConfig({ type: 'rainbow' });
  
  const { getProvider } = await import('./provider.js');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// 清理 Rainbow provider
export function cleanupRainbowProvider() {
  clearProvider();
} 