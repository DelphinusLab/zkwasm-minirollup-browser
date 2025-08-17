// ZKWASM Staking Platform Types

export interface LeaderboardEntry {
  rank: number;
  pkx: string;
  userId: string;
  totalStaked: bigint;
  basePoints: bigint;
  effectivePoints: bigint;
  lastStakeTime: bigint;
  nonce: number;
}

export interface GlobalStats {
  totalStaked: bigint;
  totalPlayers: bigint;
  currentCounter: bigint;
  averageEffectivePoints: bigint;
  totalEffectivePoints: bigint;
}

export interface UserData {
  userId: string;
  pkx: string;
  totalStaked: bigint;
  basePoints: bigint;
  effectivePoints: bigint;
  lastStakeTime: bigint;
  nonce: number;
}

export interface Transaction {
  id: string;
  type: 'stake' | 'unstake' | 'install' | 'withdraw_usdt' | 'withdraw_points';
  amount: bigint;
  timestamp: bigint;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  balance: bigint;
  processingKey: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PlayerAccount {
  _id: string;
  pkx: string;
  __v: number;
  index: number;
  data: {
    nonce: number;
    data: {
      points: number;
      last_stake_time: number;
      total_staked: number;
      last_update_time: number;
    };
  } | null;
}

export interface QueryStateResponse {
  player: {
    nonce: number;
    data: {
      points: number;
      last_stake_time: number;
      total_staked: number;
      last_update_time: number;
    };
  };
  state: {
    counter: number;
    total_players: number;
    total_staked: number;
    txsize: number;
    txcounter: number;
  };
}

// Chart Data Types
export interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

export interface StakingChartData {
  stakingGrowth: ChartDataPoint[];
  topStakers: { name: string; value: number; color: string }[];
  effectivePointsHistory: ChartDataPoint[];
}