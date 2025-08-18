import { useAccount, useChainId } from 'wagmi';

interface ConnectionState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
}

export function useConnection(): ConnectionState {
  // Direct wagmi state - this is the single source of truth
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const wagmiChainId = useChainId();

  // Simply return wagmi state directly - no fallback needed
  return {
    isConnected: wagmiIsConnected,
    address: wagmiAddress,
    chainId: wagmiChainId
  };
} 