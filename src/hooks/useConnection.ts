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

  // Use wagmi hooks directly - this is the correct approach
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const wagmiChainId = useChainId();

  useEffect(() => {
    const updateConnectionState = async () => {
      // First try to use wagmi state
      if (wagmiIsConnected && wagmiAddress) {
        // Enhanced WalletConnect session validation for auto-reconnected sessions
        try {
          if (hasEthereumProvider()) {
            console.log('🔍 Validating auto-reconnected session...');
            
            // Test if provider is responsive with a short timeout
            const accountsPromise = window.ethereum!.request({ method: 'eth_accounts' });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session validation timeout')), 5000)
            );
            
            const accounts = await Promise.race([accountsPromise, timeoutPromise]);
            
            // Validate account match
            if (!accounts || accounts.length === 0) {
              console.warn('⚠️ No accounts returned, session invalid');
              throw new Error('No accounts available');
            }
            
            if (accounts[0].toLowerCase() !== wagmiAddress.toLowerCase()) {
              console.warn('⚠️ Account mismatch, session invalid', {
                expected: wagmiAddress,
                actual: accounts[0]
              });
              throw new Error('Account mismatch');
            }
            
            // Test if we can make a simple RPC call
            try {
              await Promise.race([
                window.ethereum!.request({ method: 'eth_chainId' }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Chain ID timeout')), 3000)
                )
              ]);
              console.log('✅ Session validation passed');
            } catch (rpcError) {
              console.warn('⚠️ RPC call failed, session might be stale');
              throw rpcError;
            }
            
          }
        } catch (error) {
          console.warn('❌ Session validation failed, clearing invalid session:', error);
          
          // Clear invalid session immediately
          const { clearProviderInstance } = await import('../providers/provider');
          const { clearWalletConnectStorage: clearStorage } = await import('../delphinus-provider');
          
          clearStorage();
          clearProviderInstance();
          
          // Force disconnect from wagmi as well
          try {
            const { disconnect } = await import('wagmi/actions');
            const { getSharedWagmiConfig } = await import('../providers/provider');
            const config = getSharedWagmiConfig();
            if (config) {
              disconnect(config);
            }
          } catch (disconnectError) {
            console.warn('Failed to disconnect wagmi:', disconnectError);
          }
          
          setConnectionState({
            isConnected: false,
            address: undefined,
            chainId: undefined
          });
          return;
        }
        
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

      // If wagmi doesn't detect connection but window.ethereum exists, check direct connection state
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

              // If neither is connected, set to disconnected state
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

        // Listen to ethereum events for state consistency checks
  useEffect(() => {
    if (!hasEthereumProvider()) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('🔄 Accounts changed detected:', accounts);
      
      // Check consistency between wagmi and ethereum state
      if (accounts.length > 0 && wagmiAddress && wagmiAddress !== accounts[0]) {
        console.warn('⚠️ Wagmi and ethereum state mismatch:', {
          wagmiAddress,
          ethereumAddress: accounts[0]
        });
      }
      
              // If wagmi hasn't updated, use direct state
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
      
      // Update chain ID
      setConnectionState(prevState => {
        if (prevState.isConnected) {
          return { ...prevState, chainId: newChainId };
        }
        return prevState;
      });
    };

          // Listen to our custom sync events
    const handleWalletConnected = (event: CustomEvent) => {
      console.log('🔄 Custom wallet connected event:', event.detail);
      const { address, chainId } = event.detail;
      
      setConnectionState({
        isConnected: true,
        address,
        chainId
      });
    };

          // Add event listeners
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