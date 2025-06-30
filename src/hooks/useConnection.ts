import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { hasEthereumProvider, getConnectedAccounts } from '../utils/provider';

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
    const updateConnectionState = async () => {
      // 首先尝试使用 wagmi 的状态
      if (wagmiIsConnected && wagmiAddress) {
        const newState = {
          isConnected: wagmiIsConnected,
          address: wagmiAddress,
          chainId: wagmiChainId
        };
        
        setConnectionState(prevState => {
          const hasChanged = 
            prevState.isConnected !== newState.isConnected ||
            prevState.address !== newState.address ||
            prevState.chainId !== newState.chainId;

          return hasChanged ? newState : prevState;
        });
        return;
      }

      // 如果 wagmi 没有检测到连接，但有 window.ethereum，检查直接连接状态
      if (hasEthereumProvider()) {
        try {
          const accounts = await getConnectedAccounts();
          if (accounts.length > 0) {
            const chainIdHex = await window.ethereum!.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            
            const fallbackState = {
              isConnected: true,
              address: accounts[0],
              chainId: chainId
            };
            
            console.log('🔄 Using fallback connection state:', fallbackState);
            
            setConnectionState(prevState => {
              const hasChanged = 
                prevState.isConnected !== fallbackState.isConnected ||
                prevState.address !== fallbackState.address ||
                prevState.chainId !== fallbackState.chainId;

              return hasChanged ? fallbackState : prevState;
            });
            return;
          }
        } catch (error) {
          console.warn('Failed to check direct wallet connection:', error);
        }
      }

      // 如果都没有连接，设置为未连接状态
      const disconnectedState = {
        isConnected: false,
        address: undefined,
        chainId: undefined
      };
      
      setConnectionState(prevState => {
        if (prevState.isConnected) {
          return disconnectedState;
        }
        return prevState;
      });
    };

    updateConnectionState();
  }, [wagmiAddress, wagmiIsConnected, wagmiChainId]);

  // 监听以太坊事件以进行状态一致性检查
  useEffect(() => {
    if (!hasEthereumProvider()) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('🔄 Accounts changed detected:', accounts);
      
      // 检查 wagmi 和 ethereum 状态的一致性
      if (accounts.length > 0 && wagmiAddress && wagmiAddress !== accounts[0]) {
        console.warn('⚠️ Wagmi and ethereum state mismatch:', {
          wagmiAddress,
          ethereumAddress: accounts[0]
        });
      }
      
      // 如果 wagmi 没有更新，使用直接状态
      if (!wagmiIsConnected && accounts.length > 0) {
        try {
          const chainIdHex = await window.ethereum!.request({ method: 'eth_chainId' });
          const chainId = parseInt(chainIdHex, 16);
          
          setConnectionState({
            isConnected: true,
            address: accounts[0],
            chainId: chainId
          });
        } catch (error) {
          console.error('Failed to update connection state:', error);
        }
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('🔄 Chain changed detected:', newChainId);
      
      if (wagmiChainId && wagmiChainId !== newChainId) {
        console.warn('⚠️ Wagmi and ethereum chain mismatch:', {
          wagmiChainId,
          ethereumChainId: newChainId
        });
      }
      
      // 更新链ID
      setConnectionState(prevState => {
        if (prevState.isConnected) {
          return { ...prevState, chainId: newChainId };
        }
        return prevState;
      });
    };

    // 监听我们的自定义同步事件
    const handleWalletConnected = (event: CustomEvent) => {
      console.log('🔄 Custom wallet connected event:', event.detail);
      const { address, chainId } = event.detail;
      
      setConnectionState({
        isConnected: true,
        address,
        chainId
      });
    };

    // 添加事件监听器
    window.ethereum!.on('accountsChanged', handleAccountsChanged);
    window.ethereum!.on('chainChanged', handleChainChanged);
    window.addEventListener('walletConnected', handleWalletConnected as EventListener);

    return () => {
      window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum!.removeListener('chainChanged', handleChainChanged);
      window.removeEventListener('walletConnected', handleWalletConnected as EventListener);
    };
  }, [wagmiAddress, wagmiChainId, wagmiIsConnected]);

  return connectionState;
} 