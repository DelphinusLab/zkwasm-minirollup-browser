import { createConfig, http } from 'wagmi';
import { arbitrum, base, bsc, localhost, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';

// Get project configuration from environment variables, compatible with different environments
function getProjectConfig() {
  // Vite environment variables (browser environment)
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return {
      walletConnectProjectId: (window as any).ENV.REACT_APP_WALLETCONNECT_PROJECT_ID,
      chainId: parseInt((window as any).ENV.REACT_APP_CHAIN_ID || '1'),
      rpcUrl: (window as any).ENV.REACT_APP_URL,
    };
  }
  
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return {
      walletConnectProjectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
      chainId: parseInt(process.env.REACT_APP_CHAIN_ID || '1'),
      rpcUrl: process.env.REACT_APP_URL,
    };
  }
  
  // Default values
  return {
    walletConnectProjectId: '',
    chainId: 1,
    rpcUrl: '',
  };
}

// Get target chain ID
export function getChainId(): number {
  const config = getProjectConfig();
  
  // Try to get from import.meta.env first (Vite environment)
  if (typeof window !== 'undefined' && (import.meta as any)?.env) {
    const chainId = (import.meta as any).env.REACT_APP_CHAIN_ID;
    if (chainId) {
      return parseInt(chainId);
    }
  }
  
  return config.chainId || 11155111; // Default Sepolia testnet
}

// Chain ID to chain object mapping
const chainMap: Record<number, any> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  8453: base,
  10: optimism,
  56: bsc,
  31337: localhost, // Local development chain
};

// Get corresponding chain based on configured chain ID
function getTargetChain() {
  const targetChainId = getChainId();
  const targetChain = chainMap[targetChainId];
  
  if (!targetChain) {
    console.warn(`Chain ${targetChainId} not found in chainMap, falling back to mainnet`);
    // Only return target chain, don't add other chains as alternatives
    return mainnet;
  }
  
  // If no corresponding chain found, return mainnet
  return targetChain;
}
// Configure supported chains
const targetChain = getTargetChain();

export const wagmiConfig = createConfig({
  chains: [targetChain], // Only include target chain
  transports: {
    [targetChain.id]: http(),
  },
  ssr: false, // Set to false if your app doesn't use SSR
});

export { targetChain };

