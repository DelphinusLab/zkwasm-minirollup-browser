import { useState, useEffect } from 'react';
import { withProvider } from '../providers/provider';
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

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!hasEthereumProvider()) {
          setConnectionState({
            isConnected: false,
            address: undefined,
            chainId: undefined
          });
          return;
        }

        const accounts = await getConnectedAccounts();
        
        if (accounts.length > 0) {
          try {
            const result = await withProvider(async (provider) => {
              const networkId = await provider.getNetworkId();
              return {
                isConnected: true,
                address: accounts[0],
                chainId: Number(networkId)
              };
            });
            
            setConnectionState(result);
          } catch (error) {
            console.warn('Provider error while checking connection:', error);
            setConnectionState({
              isConnected: false,
              address: undefined,
              chainId: undefined
            });
          }
        } else {
          setConnectionState({
            isConnected: false,
            address: undefined,
            chainId: undefined
          });
        }
      } catch (error) {
        console.warn('Connection check error:', error);
        setConnectionState({
          isConnected: false,
          address: undefined,
          chainId: undefined
        });
      }
    };

    checkConnection();

    // 监听账户变化
    if (hasEthereumProvider()) {
      const handleAccountsChanged = (accounts: string[]) => {
        setConnectionState(prev => ({
          ...prev,
          isConnected: accounts.length > 0,
          address: accounts.length > 0 ? accounts[0] : undefined
        }));
      };

      const handleChainChanged = (chainId: string) => {
        setConnectionState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16)
        }));
      };

      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  return connectionState;
} 