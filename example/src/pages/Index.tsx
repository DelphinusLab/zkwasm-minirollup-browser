import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { GlobalStatsCard } from "@/components/dashboard/GlobalStatsCard";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { StakingForm } from "@/components/personal/StakingForm";
import { PointsExchangeForm } from "@/components/personal/PointsExchangeForm";
import { TokenSupplyInfo } from "@/components/dashboard/TokenSupplyInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  TrendingUp, 
  Zap, 
  Target,
  Wallet,
  AlertTriangle
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useConnectModal } from "zkwasm-minirollup-browser";
import { 
  stakingService, 
  StakingCalculator, 
  PlayerUtils, 
  StakingError,
  type LeaderboardEntry, 
  type GlobalState,
  type CombinedStakingData 
} from "@/services/stakingService";
import { 
  formatBigInt,
  formatEffectivePoints,
  getTimeAgo
} from "@/utils/staking";
import { toast } from "@/hooks/use-toast";
import { useAPY } from "@/hooks/useAPY";
import { Percent } from "lucide-react";
import { BrowserProvider } from "ethers";

// USDT格式化辅助函数
function formatUSDT(amount: number, decimals: number = 2) {
  return `≈ ${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} USDT rewards`;
}


const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { apy, loading: apyLoading, formatAPY, calculateUserAPY } = useAPY();
  const [userStakeData, setUserStakeData] = useState<{
    points: bigint;
    totalStaked: bigint;
    lastStakeTime: bigint;
    lastUpdateTime: bigint;
    effectivePoints: bigint;
    nonce: number;
  } | null>(null);

  const { 
    isConnected, 
    isL2Connected, 
    l1Account,
    l2Account, 
    playerId, 
    address,
    connectL1,
    connectL2 
  } = useWallet();
  
  const { openConnectModal } = useConnectModal();

  // State for user's L1 token balance
  const [userL1Balance, setUserL1Balance] = useState<bigint>(0n);

  // Auto-connect L1 when RainbowKit connection is established (similar to pixel-launchpad-ido)
  useEffect(() => {
    if (isConnected && !l1Account) {
      console.log('Auto-connecting L1 account...');
      connectL1();
    }
  }, [isConnected, l1Account, connectL1]);

  // Auto-install player when L2 is connected
  useEffect(() => {
    const autoInstallPlayer = async () => {
      if (isL2Connected && l2Account && l2Account.getPrivateKey && playerId) {
        try {
          console.log('Auto-installing player...');
          const processingKey = l2Account.getPrivateKey();
          await stakingService.installPlayer(processingKey);
          console.log('Player auto-installed successfully');
        } catch (error) {
          // Filter out "PlayerAlreadyExist" errors - this is expected and not an error
          if (error instanceof StakingError && 
              (error.message.includes("PlayerAlreadyExist") || 
               error.message.includes("Player already exists") ||
               error.message.includes("already exist") ||
               error.message.includes("PlayerAlreadyExists"))) {
            console.log('Player already exists, skipping installation');
            return;
          }
          // Also handle generic Error objects that might contain the message
          if (error instanceof Error &&
              (error.message.includes("PlayerAlreadyExist") ||
               error.message.includes("PlayerAlreadyExists") ||
               error.message.includes("Player already exists"))) {
            console.log('Player already exists, skipping installation');
            return;
          }
          console.error('Failed to auto-install player:', error);
        }
      }
    };

    autoInstallPlayer();
  }, [isL2Connected, l2Account, playerId]);

  // Fetch user's L1 token balance
  useEffect(() => {
    const fetchL1Balance = async () => {
      if (address && isConnected && l1Account) {
        try {
          // Use existing provider or create ethers provider from window.ethereum
          let provider = l1Account.provider;
          
          // If no provider from l1Account, create ethers provider manually
          if (!provider && (window as any).ethereum) {
            console.log('🔧 Creating ethers BrowserProvider for L1 balance (ethers v6)');
            provider = new BrowserProvider((window as any).ethereum);
          }
          
          if (!provider) {
            throw new Error('No provider available for L1 balance check');
          }
          
          const balance = await stakingService.getL1TokenBalance(address, provider);
          console.log('🔍 L1 balance:', balance);
          setUserL1Balance(balance);
        } catch (error) {
          console.error('Failed to fetch L1 balance:', error);
          setUserL1Balance(0n);
        }
      } else {
        setUserL1Balance(0n);
      }
    };

    fetchL1Balance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchL1Balance, 30000);
    return () => clearInterval(interval);
  }, [address, isConnected, l1Account]);

  // Fetch combined staking data (leaderboard + global stats + user rank)
  const { 
    data: combinedData, 
    isLoading: combinedDataLoading, 
    refetch: refetchCombinedData 
  } = useQuery({
    queryKey: ['combinedStakingData', l2Account?.getPrivateKey?.()],
    queryFn: () => stakingService.getCombinedStakingData(l2Account?.getPrivateKey?.()),
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: true,
  });

  // Extract data from combined result
  const leaderboardData = combinedData?.leaderboard || [];
  const globalStats = combinedData?.globalStats;
  const currentUserRank = combinedData?.userRank;
  
  // Loading states
  const leaderboardLoading = combinedDataLoading;
  const globalStatsLoading = combinedDataLoading;

  // Fetch user data when L2 connected
  const { 
    data: userData, 
    isLoading: userDataLoading,
    refetch: refetchUserData 
  } = useQuery({
    queryKey: ['userData', l2Account?.getPrivateKey?.()],
    queryFn: async () => {
      if (!l2Account || !l2Account.getPrivateKey) return null;
      const processingKey = l2Account.getPrivateKey();
      return await stakingService.queryUserState(processingKey);
    },
    enabled: !!l2Account && !!l2Account.getPrivateKey && isL2Connected,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Update user stake data with effective points calculation
  useEffect(() => {
    if (userData && globalStats) {
      const currentCounter = globalStats.counter;
      const effectivePoints = StakingCalculator.calculateEffectivePoints(
        userData.player.data.points,
        userData.player.data.total_staked,
        userData.player.data.last_stake_time,
        currentCounter,
        userData.player.data.last_update_time
      );

      setUserStakeData({
        points: userData.player.data.points,
        totalStaked: userData.player.data.total_staked,
        lastStakeTime: userData.player.data.last_stake_time,
        lastUpdateTime: userData.player.data.last_update_time || 0n,
        effectivePoints,
        nonce: userData.player.nonce
      });
    } else {
      setUserStakeData(null);
    }
  }, [userData, globalStats]);

  // Real-time effective points update based on backend counter
  useEffect(() => {
    if (!userStakeData || !globalStats) return;

    // Store the initial backend counter and client timestamp for sync
    const initialBackendCounter = globalStats.counter;
    const initialClientTime = BigInt(Math.floor(Date.now() / 1000));

    const interval = setInterval(() => {
      const currentClientTime = BigInt(Math.floor(Date.now() / 1000));
      const timeDelta = currentClientTime - initialClientTime;
      // Estimate current backend counter by adding client time delta to initial backend counter
      const estimatedBackendCounter = initialBackendCounter + timeDelta;
      
      const newEffectivePoints = StakingCalculator.calculateEffectivePoints(
        userStakeData.points,
        userStakeData.totalStaked,
        userStakeData.lastStakeTime,
        estimatedBackendCounter,
        userStakeData.lastUpdateTime
      );

      setUserStakeData(prev => prev ? {
        ...prev,
        effectivePoints: newEffectivePoints
      } : null);
    }, 1000); // Update every second for real-time effect

    return () => clearInterval(interval);
  }, [userStakeData, globalStats]);

  const handleRefreshLeaderboard = () => {
    refetchCombinedData();
  };

  const handleStakingSuccess = async () => {
    // Refresh user data after successful transaction
    refetchUserData();
    refetchCombinedData(); // This now includes leaderboard and user rank
    
    // Also refresh L1 balance
    if (address && isConnected && l1Account) {
      try {
        let provider = l1Account.provider;
        
        // If no provider from l1Account, create ethers provider manually
        if (!provider && (window as any).ethereum) {
          console.log('🔧 Creating ethers BrowserProvider for L1 balance refresh (ethers v6)');
          provider = new BrowserProvider((window as any).ethereum);
        }
        
        if (!provider) {
          throw new Error('No provider available for L1 balance refresh');
        }
        
        const balance = await stakingService.getL1TokenBalance(address, provider);
        setUserL1Balance(balance);
      } catch (error) {
        console.error('Failed to refresh L1 balance:', error);
      }
    }
    
    // No toast here - let StakingForm show its own success message
  };

  // Calculate points production rate (points per day, adjusted by 17280)
  const getPointsRate = (totalStaked: bigint): string => {
    if (totalStaked === 0n) return '0/day';
    
    // Points rate = totalStaked per counter, and 1 counter = 5 seconds
    // Points per second = totalStaked / 5
    // Points per day = (totalStaked / 5) * 86400 seconds
    // Then divide by 17280 for display adjustment
    const pointsPerDay = (Number(totalStaked) / 5) * 86400 / 17280;
    
    if (pointsPerDay >= 1000000) {
      return `${(pointsPerDay / 1000000).toFixed(1)}M/day`;
    } else if (pointsPerDay >= 1000) {
      return `${(pointsPerDay / 1000).toFixed(1)}K/day`;
    } else if (pointsPerDay >= 1) {
      return `${pointsPerDay.toFixed(1)}/day`;
    } else {
      return `${pointsPerDay.toFixed(2)}/day`;
    }
  };

  // User rank is now included in combinedData, no separate query needed

    // Calculate derived stats (divide by 17280 for display)
  const totalEffectivePoints = leaderboardData.reduce((sum, entry) => sum + entry.effectivePoints, 0n);
  const averageEffectivePoints = leaderboardData.length > 0 ?
    totalEffectivePoints / BigInt(leaderboardData.length) : 0n;

  return (
    <div className="min-h-screen animated-bg">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="personal"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              My Staking
            </TabsTrigger>
            <TabsTrigger 
              value="exchange"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Points Exchange
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Global Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <GlobalStatsCard
                title="Total $ZKWASM Staked"
                value={globalStats?.total_staked || 0n}
                format="bigint"
                icon={<TrendingUp className="w-4 h-4" />}
                loading={globalStatsLoading}
                description="Across all stakers"
              />
              <GlobalStatsCard
                title="Total Stakers"
                value={globalStats?.total_players || 0n}
                format="bigint"
                icon={<Users className="w-4 h-4" />}
                loading={globalStatsLoading}
                description="Active participants"
              />
              <GlobalStatsCard
                title="Avg Effective Points"
                value={averageEffectivePoints / 17280n}
                format="bigint"
                icon={<Target className="w-4 h-4" />}
                loading={leaderboardLoading}
                description="Per staker"
              />
              <GlobalStatsCard
                title="Total Effective Points"
                value={totalEffectivePoints / 17280n}
                format="bigint"
                icon={<Zap className="w-4 h-4" />}
                loading={leaderboardLoading}
                description="Network-wide"
              />
              <GlobalStatsCard
                title="Current APY"
                value={apy}
                format="apy"
                icon={<Percent className="w-4 h-4" />}
                loading={apyLoading}
                description="Annual yield"
              />
            </div>

            {/* Token Supply Info */}
            <TokenSupplyInfo />

            {/* Leaderboard */}
            <LeaderboardTable
              data={leaderboardData}
              loading={leaderboardLoading}
              onRefresh={handleRefreshLeaderboard}
              currentUserRank={currentUserRank}
              currentUserPkx={l2Account?.getPrivateKey?.()}
              currentCounter={globalStats?.counter}
            />
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            {!isConnected ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your wallet to view your $ZKWASM staking statistics and manage your stakes
                  </p>
                  <button 
                    onClick={() => openConnectModal?.()}
                    className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </button>
                </CardContent>
              </Card>
            ) : !isL2Connected ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect L2 Account</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your L2 account to access staking features and view your statistics
                  </p>
                  <button 
                    onClick={connectL2}
                    className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Connect L2 Account
                  </button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Personal Stats */}
                {userStakeData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total $ZKWASM Staked
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          {formatBigInt(userStakeData.totalStaked)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your current $ZKWASM stake
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Effective Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary neon-text">
                          {formatEffectivePoints(userStakeData.effectivePoints)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Real-time calculation
                        </p>
                        <p className="text-xs text-yellow-500 mt-1">
                          {formatUSDT(Number(userStakeData.effectivePoints / 17280n) / 100000, 5)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Current Rank
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-accent">
                          {userStakeData.totalStaked === 0n ? 'N/A' : `#${currentUserRank || 'N/A'}`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Global leaderboard
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Points Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {getPointsRate(userStakeData.totalStaked)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Points per day
                        </p>
                        <p className="text-xs text-yellow-500 mt-1">
                          {formatUSDT(Number(userStakeData.totalStaked) / 100000, 4).replace('rewards', 'rewards / day')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Your APY
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {apyLoading ? (
                            <div className="animate-pulse bg-muted h-8 w-20 rounded"></div>
                          ) : (
                            formatAPY(calculateUserAPY(userStakeData.totalStaked))
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Annual percentage yield
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Connection Status */}
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Wallet Connected:</strong> {address} | 
                    <strong> User ID:</strong> {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'Unknown'}
                  </AlertDescription>
                </Alert>

                {/* Staking Forms */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StakingForm
                    type="stake"
                    userBalance={userL1Balance}
                    stakedAmount={userStakeData?.totalStaked || 0n}
                    effectivePoints={userStakeData?.effectivePoints || 0n}
                    lastStakeTime={userStakeData?.lastStakeTime || 0n}
                    currentCounter={globalStats?.counter}
                    onSuccess={handleStakingSuccess}
                  />
                  <StakingForm
                    type="unstake"
                    userBalance={userL1Balance}
                    stakedAmount={userStakeData?.totalStaked || 0n}
                    effectivePoints={userStakeData?.effectivePoints || 0n}
                    lastStakeTime={userStakeData?.lastStakeTime || 0n}
                    currentCounter={globalStats?.counter}
                    onSuccess={handleStakingSuccess}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="exchange" className="space-y-6">
            {/* Personal Statistics - Show when connected */}
            {isConnected && isL2Connected && userStakeData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total $ZKWASM Staked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {formatBigInt(userStakeData.totalStaked)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your current $ZKWASM stake
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Available Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary neon-text">
                      {formatEffectivePoints(userStakeData.effectivePoints)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For exchange/withdrawal
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Current Rank
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent">
                      {userStakeData.totalStaked === 0n ? 'N/A' : `#${currentUserRank || 'N/A'}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Global leaderboard
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Points Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {getPointsRate(userStakeData.totalStaked)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Points per day
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Your APY
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {apyLoading ? (
                        <div className="animate-pulse bg-muted h-8 w-20 rounded"></div>
                      ) : (
                        formatAPY(calculateUserAPY(userStakeData.totalStaked))
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Annual percentage yield
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isConnected ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your wallet to exchange your staking points for USDT or withdraw points
                  </p>
                  <button 
                    onClick={() => openConnectModal?.()}
                    className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </button>
                </CardContent>
              </Card>
            ) : !isL2Connected ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect L2 Account</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your L2 account to access points exchange features
                  </p>
                  <button 
                    onClick={connectL2}
                    className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Connect L2 Account
                  </button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Connection Status */}
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Wallet Connected:</strong> {address} | 
                    <strong> User ID:</strong> {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'Unknown'}
                  </AlertDescription>
                </Alert>

                {/* Points Exchange Form */}
                {userStakeData && (
                  <PointsExchangeForm
                    effectivePoints={userStakeData.effectivePoints}
                    currentCounter={globalStats?.counter}
                    onSuccess={handleStakingSuccess}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
