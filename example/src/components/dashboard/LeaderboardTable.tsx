import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, RefreshCw, ArrowUpDown } from "lucide-react";
import { LeaderboardEntry } from "@/services/stakingService";
import { formatBigInt, formatEffectivePoints, truncateAddress } from "@/utils/staking";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  loading: boolean;
  onRefresh: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  currentUserRank?: number;
  currentUserPkx?: string;
  currentCounter?: bigint; // Backend counter for calculating time differences
}

type SortBy = 'totalStaked' | 'effectivePoints';

export const LeaderboardTable = ({ 
  data, 
  loading, 
  onRefresh,
  onLoadMore,
  hasMore = false,
  currentUserRank,
  currentUserPkx,
  currentCounter
}: LeaderboardTableProps) => {
  const [sortBy, setSortBy] = useState<SortBy>('totalStaked');

  // Filter and sort data based on current sort method (data is already limited to top 100 from backend)
  const processedData = data
    .filter(entry => {
      // Only show entries with totalStaked > 0
      const totalStaked = typeof entry.totalStaked === 'bigint' ? entry.totalStaked : BigInt(entry.totalStaked || 0);
      return totalStaked > 0n;
    })
    .sort((a, b) => {
      if (sortBy === 'totalStaked') {
        return a.totalStaked > b.totalStaked ? -1 : a.totalStaked < b.totalStaked ? 1 : 0;
      } else {
        return a.effectivePoints > b.effectivePoints ? -1 : a.effectivePoints < b.effectivePoints ? 1 : 0;
      }
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
  };

  const isCurrentUser = (pkx: string) => {
    return currentUserPkx && pkx === currentUserPkx;
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

  // Calculate time ago based on backend counter difference (1 counter = 5 seconds)
  const getTimeAgoFromCounter = (lastStakeTime: bigint): string => {
    if (lastStakeTime === 0n) return 'Never';
    if (!currentCounter) return 'Unknown';
    
    // Calculate how many seconds ago the last stake happened
    const counterDiff = currentCounter - lastStakeTime;
    const secondsAgo = Number(counterDiff) * 5; // 1 counter = 5 seconds
    
    // Debug log for development (can be removed in production)
    // if (import.meta.env.DEV && data.length > 0 && data[0]?.lastStakeTime === lastStakeTime) {
    //   console.log('Time calculation:', {
    //     currentCounter: currentCounter.toString(),
    //     lastStakeTime: lastStakeTime.toString(),
    //     counterDiff: counterDiff.toString(),
    //     secondsAgo
    //   });
    // }
    
    // Convert seconds to human readable format
    if (secondsAgo < 0) return 'Future'; // Handle edge case
    if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-foreground flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span>Staking Leaderboard</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Top 100 stakers ranked by {sortBy === 'totalStaked' ? 'total staked' : 'effective points'}
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <div className="flex items-center space-x-1 bg-muted/30 rounded-lg p-1 w-full sm:w-auto">
              <Button
                variant={sortBy === 'totalStaked' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('totalStaked')}
                className="h-7 px-2 text-xs flex-1 sm:flex-none sm:px-3"
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Total Staked</span>
                <span className="sm:hidden">Staked</span>
              </Button>
              <Button
                variant={sortBy === 'effectivePoints' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSortBy('effectivePoints')}
                className="h-7 px-2 text-xs flex-1 sm:flex-none sm:px-3"
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Effective Points</span>
                <span className="sm:hidden">Points</span>
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={loading}
              className="border-border hover:bg-primary/10 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {currentUserRank && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary font-medium">
              Your Current Rank: #{currentUserRank}
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Rank</TableHead>
                <TableHead className="text-muted-foreground font-medium">User</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Total Staked</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Effective Points</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Expected Rewards</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Points Rate</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Last Stake</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell>
                      <div className="w-8 h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="w-16 h-4 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="w-20 h-4 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="w-20 h-4 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="w-16 h-4 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="w-16 h-4 bg-muted animate-pulse rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No stakers found
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((entry) => (
                  <TableRow 
                    key={entry.pkx} 
                    className={`border-border hover:bg-muted/30 transition-smooth ${
                      isCurrentUser(entry.pkx) ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(entry.rank)}
                        <Badge variant={getRankBadgeVariant(entry.rank)} className="min-w-[2rem] justify-center">
                          #{entry.rank}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`font-mono text-sm ${isCurrentUser(entry.pkx) ? 'text-primary font-medium' : 'text-foreground'}`}>
                        {truncateAddress(entry.pkx, 6)}
                        {isCurrentUser(entry.pkx) && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="font-medium text-foreground">
                        {formatBigInt(entry.totalStaked)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="text-primary font-bold">
                        {formatEffectivePoints(entry.effectivePoints)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-yellow-600 font-mono font-bold">
                        {(Number(entry.effectivePoints) / 100000 / 17280).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {getPointsRate(entry.totalStaked)}
                      </div>
                      <p className="text-xs text-yellow-500 mt-1 text-right">
                        ≈ {(Number(entry.totalStaked) / 100000).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} USDT/day
                      </p>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {getTimeAgoFromCounter(entry.lastStakeTime)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More functionality removed - now showing fixed top 100 */}

        {!loading && processedData.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Stakers Yet</h3>
            <p className="text-muted-foreground">
              Be the first to stake $ZKWASM tokens and earn points!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};