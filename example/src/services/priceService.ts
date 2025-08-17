// Token Price Service
export interface TokenPrice {
  price: number;
  change24h?: number;
  lastUpdated: number;
}

export class PriceService {
  private static instance: PriceService;
  private cache: Map<string, { data: TokenPrice; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  private constructor() {}

  async getTokenPrice(contractAddress: string): Promise<TokenPrice> {
    const cacheKey = contractAddress.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    console.log(`🔍 Fetching price for token: ${contractAddress}`);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📦 Using cached price data');
      return cached.data;
    }

    try {
      // Try multiple price sources
      console.log('🌐 Trying CoinGecko API...');
      let price = await this.getPriceFromCoingecko(contractAddress);
      
      if (!price) {
        console.log('🔄 CoinGecko failed, trying DexScreener...');
        price = await this.getPriceFromDexScreener(contractAddress);
      }
      
      if (!price) {
        console.log('🔄 DexScreener failed, trying CoinMarketCap...');
        price = await this.getPriceFromCoinMarketCap(contractAddress);
      }

      if (!price) {
        console.warn('⚠️ All price sources failed');
      } else {
        console.log(`✅ Successfully fetched price: $${price.price}`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error('❌ Error fetching token price:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('📦 Using expired cached data due to error');
        return cached.data;
      }
      
      // Final fallback
      console.warn('⚠️ Using final fallback price due to error');
      return {
        price: 0.001,
        lastUpdated: Date.now()
      };
    }
  }

  private async getPriceFromCoingecko(contractAddress: string): Promise<TokenPrice | null> {
    try {
      // Try multiple networks for CoinGecko
      const networks = ['ethereum', 'binance-smart-chain', 'polygon-pos'];
      
      for (const network of networks) {
        try {
          const url = `https://api.coingecko.com/api/v3/simple/token_price/${network}?contract_addresses=${contractAddress}&vs_currencies=usd&include_24hr_change=true`;
          console.log(`🔗 CoinGecko ${network}:`, url);
          
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            }
          });

          console.log(`📡 CoinGecko ${network} response:`, response.status, response.statusText);

          if (!response.ok) continue;

          const data = await response.json();
          console.log(`📊 CoinGecko ${network} data:`, data);
          
          const tokenData = data[contractAddress.toLowerCase()];
          
          if (tokenData && tokenData.usd) {
            console.log(`✅ CoinGecko ${network} found price:`, tokenData.usd);
            return {
              price: tokenData.usd || 0,
              change24h: tokenData.usd_24h_change,
              lastUpdated: Date.now()
            };
          }
        } catch (networkError) {
          console.log(`❌ CoinGecko ${network} error:`, networkError);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ CoinGecko API error:', error);
      return null;
    }
  }

  private async getPriceFromDexScreener(contractAddress: string): Promise<TokenPrice | null> {
    try {
      // DexScreener API (free)
      const url = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;
      console.log('🔗 DexScreener URL:', url);
      
      const response = await fetch(url);
      console.log('📡 DexScreener response:', response.status, response.statusText);

      if (!response.ok) {
        console.log('❌ DexScreener response not ok');
        return null;
      }

      const data = await response.json();
      console.log('📊 DexScreener data:', data);
      
      if (!data.pairs || data.pairs.length === 0) {
        console.log('❌ DexScreener: No pairs found');
        return null;
      }

      // Get the pair with highest liquidity
      const bestPair = data.pairs.reduce((best: any, current: any) => 
        (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
      );

      console.log('📈 DexScreener best pair:', bestPair);

      const price = parseFloat(bestPair.priceUsd) || 0;
      if (price > 0) {
        console.log(`✅ DexScreener found price: $${price}`);
        return {
          price,
          change24h: parseFloat(bestPair.priceChange?.h24),
          lastUpdated: Date.now()
        };
      }

      console.log('❌ DexScreener: Invalid price');
      return null;
    } catch (error) {
      console.error('❌ DexScreener API error:', error);
      return null;
    }
  }

  private async getPriceFromCoinMarketCap(contractAddress: string): Promise<TokenPrice | null> {
    try {
      // This would require an API key for production use
      // For now, return null to skip this source
      return null;
    } catch (error) {
      console.error('CoinMarketCap API error:', error);
      return null;
    }
  }

  // Calculate APY based on the given formula
  calculateAPY(tokenPrice: number, stakedAmount: bigint): number {
    if (tokenPrice <= 0 || stakedAmount <= 0n) return 0;

    // Formula: 1 token per day = 1 point, 100,000 points = 1 USDT
    // Daily reward per token = 1 point = 1/100000 USDT = 0.00001 USDT
    const dailyRewardPerToken = 0.00001; // USDT per token per day
    const dailyRewardUSD = Number(stakedAmount) * dailyRewardPerToken;
    const dailyYield = dailyRewardUSD / (Number(stakedAmount) * tokenPrice);
    const annualYield = dailyYield * 365;
    
    return annualYield * 100; // Convert to percentage
  }

  // Format APY for display
  formatAPY(apy: number): string {
    if (apy === 0) return '0%';
    if (apy < 0.01) return '<0.01%';
    if (apy >= 1000) return `${(apy / 1000).toFixed(1)}K%`;
    return `${apy.toFixed(2)}%`;
  }
}

export const priceService = PriceService.getInstance(); 