import { useState, useEffect } from 'react';
import { priceService, TokenPrice } from '@/services/priceService';

export interface APYData {
  apy: number;
  tokenPrice: TokenPrice;
  loading: boolean;
  error: string | null;
}

export const useAPY = () => {
  const [apyData, setApyData] = useState<APYData>({
    apy: 0,
    tokenPrice: { price: 0, lastUpdated: Date.now() },
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchAPYData = async () => {
      try {
        setApyData(prev => ({ ...prev, loading: true, error: null }));
        
        let tokenContract = 
          import.meta.env?.REACT_APP_TOKEN_CONTRACT
        
        // Remove quotes if present
        if (tokenContract.startsWith('"') && tokenContract.endsWith('"')) {
          tokenContract = tokenContract.slice(1, -1);
        }
        
        console.log('🪙 APY hook - Token contract address:', tokenContract);
        
        const tokenPrice = await priceService.getTokenPrice(tokenContract);
        
        // Calculate APY for 1 token (as a base reference)
        const baseStakeAmount = 1n * BigInt(10 ** 18); // 1 token in wei
        const apy = priceService.calculateAPY(tokenPrice.price, baseStakeAmount);
        
        setApyData({
          apy,
          tokenPrice,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching APY data:', error);
        setApyData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load APY data'
        }));
      }
    };

    fetchAPYData();
    
    // Refresh APY data every 5 minutes
    const interval = setInterval(fetchAPYData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const calculateUserAPY = (stakedAmount: bigint): number => {
    if (apyData.loading || apyData.error || stakedAmount <= 0n) {
      return 0;
    }
    
    return priceService.calculateAPY(apyData.tokenPrice.price, stakedAmount);
  };

  const formatAPY = (apy: number): string => {
    return priceService.formatAPY(apy);
  };

  return {
    ...apyData,
    calculateUserAPY,
    formatAPY,
    refresh: () => {
      // Trigger a manual refresh
      setApyData(prev => ({ ...prev, loading: true }));
    }
  };
}; 