import { DelphinusRainbowConnector, setProviderConfig, clearProvider } from './provider.js';

// React Hook: Get RainbowKit adapter instance
export function useRainbowKitAdapter() {
  throw new Error(`
    useRainbowKitAdapter requires wagmi providers to be set up.
    
    Please use the Provider pattern instead:
    
    import { setProviderConfig, withProvider } from 'zkwasm-minirollup-browser';
    
    setProviderConfig({ type: 'rainbow' });
    
    const result = await withProvider(async (provider) => {
      return await provider.connect();
    });
  `);
}

// Compatibility function: Simulate the original withRainbowKitConnector function
export async function withRainbowKitConnector<T>(
  cb: (provider: any) => Promise<T>,
  rainbowKitHooks: any
): Promise<T> {
  try {
    setProviderConfig({ type: 'rainbow' });
    
    const { getProvider } = await import('./provider.js');
    const provider = await getProvider();
    
    if (provider instanceof DelphinusRainbowConnector && rainbowKitHooks.isConnected && rainbowKitHooks.address) {
      await provider.initialize(rainbowKitHooks.address, rainbowKitHooks.chainId);
    }
    
    return await cb(provider);
  } catch (e) {
    throw e;
  }
}

// Reinitialize adapter
export async function reinitializeRainbowProvider(address: string, chainId: number) {
  clearProvider();
  setProviderConfig({ type: 'rainbow' });
  
  const { getProvider } = await import('./provider.js');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// Initialize Rainbow Provider
export async function initializeRainbowProvider(address: string, chainId: number) {
  setProviderConfig({ type: 'rainbow' });
  
  const { getProvider } = await import('./provider.js');
  const provider = await getProvider();
  
  if (provider instanceof DelphinusRainbowConnector) {
    await provider.initialize(address as `0x${string}`, chainId);
  }
  
  return provider;
}

// Cleanup Rainbow provider
export function cleanupRainbowProvider() {
  clearProvider();
} 