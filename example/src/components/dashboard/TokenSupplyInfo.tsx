import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingUp, DollarSign } from "lucide-react";
import { priceService, TokenPrice } from "@/services/priceService";

export const TokenSupplyInfo = () => {
  const [circulatingSupply, setCirculatingSupply] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenPrice, setTokenPrice] = useState<TokenPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    const fetchCirculatingSupply = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://circulating.zkwasm.ai/circulating-supply/raw');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        // 格式化数字，添加千位分隔符
        const formattedNumber = parseFloat(data).toLocaleString('en-US');
        setCirculatingSupply(formattedNumber);
        setError(null);
      } catch (err) {
        console.error('Error fetching circulating supply:', err);
        setError('Failed to load circulating supply');
        setCirculatingSupply(null);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTokenPrice = async () => {
      try {
        setPriceLoading(true);
        let tokenContract = 
          import.meta.env?.REACT_APP_TOKEN_CONTRACT
        
        // Remove quotes if present
        if (tokenContract.startsWith('"') && tokenContract.endsWith('"')) {
          tokenContract = tokenContract.slice(1, -1);
        }
        
        console.log('🪙 Token contract address:', tokenContract);
        
        const price = await priceService.getTokenPrice(tokenContract);
        setTokenPrice(price);
      } catch (err) {
        console.error('Error fetching token price:', err);
        setTokenPrice(null);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchCirculatingSupply();
    fetchTokenPrice();
  }, []);

  const totalSupply = 1_000_000_000; // Fixed total supply
  const circulatingPercentage = circulatingSupply
    ? ((parseFloat(circulatingSupply?.replace(/,/g, '') || '0') / totalSupply) * 100).toFixed(2)
    : '0';

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 overflow-hidden relative">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <CardTitle className="text-lg font-bold text-foreground flex items-center space-x-2">
          <Coins className="w-5 h-5 text-primary" />
          <span>$ZKWASM Token Info</span>
        </CardTitle>
        <div className="text-primary/80">
          <TrendingUp className="w-5 h-5" />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-3">
        {/* Total Supply (Fixed) */}
        <p className="text-center text-sm md:text-base text-foreground mt-2 md:mt-3 font-medium tracking-wide">
          Total Supply (Fixed): <span className="font-bold text-purple-300">{totalSupply.toLocaleString('en-US')}</span> tokens
        </p>
        
        {/* Current Circulating Supply */}
        <p className="text-center text-sm md:text-base text-foreground mt-1 md:mt-2 font-medium tracking-wide">
          Current Circulating Supply: {' '}
          {isLoading ? (
            <span className="font-bold text-blue-300">Loading...</span>
          ) : error ? (
            <span className="font-bold text-red-300">Error loading data</span>
          ) : (
            <span className="font-bold text-blue-300">
              {circulatingSupply} ({circulatingPercentage}%)
            </span>
          )} tokens
        </p>
        
        {/* Token Price */}
        <p className="text-center text-sm md:text-base text-foreground mt-1 md:mt-2 font-medium tracking-wide">
          Current Price: {' '}
          {priceLoading ? (
            <span className="font-bold text-green-300">Loading...</span>
          ) : tokenPrice ? (
            <span className="font-bold text-green-300 flex items-center justify-center gap-1">
              <DollarSign className="w-4 h-4" />
              {tokenPrice.price.toFixed(6)}
              {tokenPrice.change24h !== undefined && (
                <span className={`text-xs ml-1 ${tokenPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({tokenPrice.change24h >= 0 ? '+' : ''}{tokenPrice.change24h.toFixed(2)}%, 24h)
                </span>
              )}
            </span>
          ) : (
            <span className="font-bold text-yellow-300">Price unavailable</span>
          )}
        </p>

        {/* Token description */}
        <p className="text-center text-xs text-muted-foreground mt-3">
          Stake $ZKWASM tokens to earn rewards and participate in the ecosystem
        </p>
      </CardContent>
    </Card>
  );
};