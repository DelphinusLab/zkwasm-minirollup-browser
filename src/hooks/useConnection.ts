import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { hasEthereumProvider } from '../utils/provider';

interface ConnectionState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
}

export function useConnection(): ConnectionState {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    address: undefined,
    chainId: undefined
  });

  // 直接使用 wagmi hooks - 这是正确的方式
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const wagmiChainId = useChainId();

  useEffect(() => {
    // 直接使用 wagmi 的状态
    const newState = {
      isConnected: wagmiIsConnected,
      address: wagmiAddress,
      chainId: wagmiChainId
    };

    // 检查状态是否真的发生了变化
    setConnectionState(prevState => {
      const hasChanged = 
        prevState.isConnected !== newState.isConnected ||
        prevState.address !== newState.address ||
        prevState.chainId !== newState.chainId;

      if (hasChanged) {
        return newState;
      }

      return prevState;
    });
  }, [wagmiAddress, wagmiIsConnected, wagmiChainId]);

  // 监听以太坊事件以进行状态一致性检查
  useEffect(() => {
    if (!hasEthereumProvider()) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      // 检查 wagmi 和 ethereum 状态的一致性
      if (accounts.length > 0 && wagmiAddress && wagmiAddress !== accounts[0]) {
        console.warn('⚠️ Wagmi and ethereum state mismatch:', {
          wagmiAddress,
          ethereumAddress: accounts[0]
        });
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      
      if (wagmiChainId && wagmiChainId !== newChainId) {
        console.warn('⚠️ Wagmi and ethereum chain mismatch:', {
          wagmiChainId,
          ethereumChainId: newChainId
        });
      }
    };

    window.ethereum!.on('accountsChanged', handleAccountsChanged);
    window.ethereum!.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum!.removeListener('chainChanged', handleChainChanged);
    };
  }, [wagmiAddress, wagmiChainId]);

  return connectionState;
} 