import { createCommand, createWithdrawCommand, LeHexBN, ZKWasmAppRpc } from "zkwasm-minirollup-rpc";
import { PrivateKey, bnToHexLe } from "delphinus-curves/src/altjubjub";
import { ethers } from "ethers";

// Command constants (match Rust backend)
const INSTALL_PLAYER = 1;
const WITHDRAW = 2;
const DEPOSIT = 3;
const WITHDRAW_USDT = 4; // Exchange points for USDT
const WITHDRAW_POINTS = 5; // Exchange points for points

// Configuration
const API_BASE_URL = import.meta.env.REACT_APP_URL || 'http://localhost:3000';

// Error handling
export class StakingError extends Error {
  public code?: number;
  public originalError?: any;

  constructor(message: string, code?: number, originalError?: any) {
    super(message);
    this.name = 'StakingError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Staking error codes from Rust backend
const STAKING_ERRORS: Record<number, string> = {
  20: "PlayerNotExist",
  21: "InsufficientStake", 
  22: "InvalidStakeAmount",
  23: "StakeTooSmall",
  24: "StakeTooLarge", 
  25: "NoStakeToWithdraw",
  31: "InsufficientPoints",
  32: "InvalidUsdtAmount",
  33: "UsdtAmountTooSmall",
  41: "InvalidPointsAmount",
  42: "PointsAmountTooSmall",
};

function handleStakingError(error: any): never {
  if (error.code && STAKING_ERRORS[error.code]) {
    throw new StakingError(STAKING_ERRORS[error.code], error.code, error);
  }
  
  if (typeof error === 'string' || error.message) {
    const errorMsg = error.message || error;
    if (errorMsg.includes("PlayerAlreadyExist")) {
      throw new StakingError("Player already exists", undefined, error);
    }
    if (errorMsg.includes("InsufficientStake")) {
      throw new StakingError("Insufficient stake amount", undefined, error);
    }
    if (errorMsg.includes("WithdrawTooEarly")) {
      throw new StakingError("WithdrawTooEarly", undefined, error);
    }
    if (errorMsg.includes("InsufficientBalance")) {
      throw new StakingError("Insufficient balance", undefined, error);
    }
    if (errorMsg.includes("NoStakeToWithdraw")) {
      throw new StakingError("No stake to withdraw", undefined, error);
    }
    if (errorMsg.includes("InvalidStakeAmount")) {
      throw new StakingError("Invalid stake amount", undefined, error);
    }
    if (errorMsg.includes("InsufficientPoints")) {
      throw new StakingError("Insufficient points for exchange", undefined, error);
    }
    if (errorMsg.includes("InvalidUsdtAmount")) {
      throw new StakingError("Invalid USDT amount", undefined, error);
    }
    if (errorMsg.includes("UsdtAmountTooSmall")) {
      throw new StakingError("USDT amount too small (minimum 1 USDT)", undefined, error);
    }
    if (errorMsg.includes("InvalidPointsAmount")) {
      throw new StakingError("Invalid points amount", undefined, error);
    }
    if (errorMsg.includes("PointsAmountTooSmall")) {
      throw new StakingError("Points amount too small (minimum 1 effective point)", undefined, error);
    }
  }
  
  throw new StakingError("Unknown staking error", undefined, error);
}

// API interfaces
export interface PlayerData {
  points: bigint;
  last_stake_time: bigint;
  total_staked: bigint;
  last_update_time: bigint;
}

export interface GlobalState {
  counter: bigint;
  total_players: bigint;
  total_staked: bigint;
  txsize: bigint;
  txcounter: bigint;
}

export interface QueryStateResponse {
  player: {
    nonce: number;
    data: PlayerData;
  };
  state: GlobalState;
}

export interface LeaderboardPlayer {
  _id: string;
  pkx: string;
  __v: number;
  index: number;
  data: {
    nonce: number;
    data: PlayerData;
  } | null;
}

export interface LeaderboardEntry {
  pkx: string;
  points: bigint;
  totalStaked: bigint;
  lastStakeTime: bigint;
  effectivePoints: bigint;
  nonce: number;
  rank: number;
}

// Combined data interface for unified data fetching
export interface CombinedStakingData {
  leaderboard: LeaderboardEntry[];
  globalStats: GlobalState;
  userRank?: number;
}

// Utility functions
export class StakingCalculator {
  // Calculate effective points for a player at given counter
  static calculateEffectivePoints(
    points: bigint,
    totalStaked: bigint,
    lastStakeTime: bigint,
    currentCounter: bigint,
    lastUpdateTime?: bigint
  ): bigint {
    // Use last_update_time for interest calculation if available, otherwise fall back to last_stake_time
    const referenceTime = (lastUpdateTime && lastUpdateTime > 0n) ? lastUpdateTime : lastStakeTime;
    
    if (referenceTime === 0n || currentCounter <= referenceTime) {
      return points;
    }
    
    const deltaTime = currentCounter - referenceTime;
    const interestPoints = totalStaked * deltaTime;
    return points + interestPoints;
  }

  // Calculate interest points for given parameters
  static calculateInterest(stakeAmount: bigint, timeDelta: bigint): bigint {
    return stakeAmount * timeDelta;
  }

  // Format counter for display
  static formatCounter(counter: bigint): string {
    return counter.toString();
  }

  // Format stake amount for display
  static formatStakeAmount(amount: bigint): string {
    return amount.toString();
  }

  // Format points for display
  static formatPoints(points: bigint): string {
    return points.toString();
  }
}

// Player ID utilities
export class PlayerUtils {
  // Generate Player ID from processing key
  static getPlayerId(processingKey: string): [bigint, bigint] {
    const pkey = PrivateKey.fromString(processingKey);
    const pubkey = pkey.publicKey.key.x.v;
    const leHexBN = new LeHexBN(bnToHexLe(pubkey));
    const pkeyArray = leHexBN.toU64Array();
    
    // Return elements [1] and [2] as player ID (0-indexed)
    return [BigInt(pkeyArray[1]), BigInt(pkeyArray[2])];
  }

  // Convert user ID array to string representation
  static userIdToString(userId: [bigint, bigint]): string {
    return `${userId[0]}_${userId[1]}`;
  }

  // Convert string to user ID array
  static stringToUserId(userIdStr: string): [bigint, bigint] {
    const parts = userIdStr.split('_');
    return [BigInt(parts[0] || 0), BigInt(parts[1] || 0)];
  }
}

// Main Staking Service
export class StakingService {
  private baseUrl: string;
  private rpc: ZKWasmAppRpc;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.rpc = new ZKWasmAppRpc(baseUrl);
  }

  // Send transaction to backend using RPC client
  private async sendTransaction(cmd: BigUint64Array, processingKey: string) {
    try {
      const result = await this.rpc.sendTransaction(cmd, processingKey);
      return result;
    } catch (error) {
      handleStakingError(error);
    }
  }

  // Query user state
  async queryUserState(processingKey: string): Promise<QueryStateResponse> {
    try {
      const result: any = await this.rpc.queryState(processingKey);
      const parsedData = JSON.parse(result.data);
      
      return {
        player: {
          nonce: parsedData.player.nonce,
          data: {
            points: BigInt(parsedData.player.data.points),
            last_stake_time: BigInt(parsedData.player.data.last_stake_time),
            total_staked: BigInt(parsedData.player.data.total_staked),
            last_update_time: BigInt(parsedData.player.data.last_update_time || 0)
          }
        },
        state: {
          counter: BigInt(parsedData.state.counter),
          total_players: BigInt(parsedData.state.total_players),
          total_staked: BigInt(parsedData.state.total_staked),
          txsize: BigInt(parsedData.state.txsize || 0),
          txcounter: BigInt(parsedData.state.txcounter || 0)
        }
      };
    } catch (error) {
      handleStakingError(error);
    }
  }

  // Get global counter from backend using fallback key
  async getGlobalCounter(): Promise<bigint> {
    try {
      // Use fallback key to query global state (similar to pixel-launchpad-ido)
      const fallbackPrivkey = "000000";
      const result: any = await this.rpc.queryState(fallbackPrivkey);
      const parsedData = JSON.parse(result.data);
      const backendCounter = BigInt(parsedData.state.counter);
      console.log('Got backend counter:', backendCounter.toString());
      return backendCounter;
    } catch (error) {
      console.warn('Failed to get global counter from backend, using client timestamp as fallback');
      // Fallback to client timestamp if backend query fails
      const fallbackCounter = BigInt(Math.floor(Date.now() / 1000));
      console.log('Using fallback counter:', fallbackCounter.toString());
      return fallbackCounter;
    }
  }

    // Get user's rank in the global leaderboard
  async getUserRank(processingKey: string): Promise<number | null> {
    try {
      // First, verify user exists
      try {
        await this.queryUserState(processingKey);
      } catch (error) {
        // User doesn't exist in the system
        return null;
      }
      
      // Generate user's PKX from processing key (little-endian format)
      let userPkx: string;
      try {
        const pkey = PrivateKey.fromString(processingKey);
        const pubkey = pkey.publicKey.key.x.v;
        userPkx = bnToHexLe(pubkey); // Convert to little-endian hex format
      } catch (error) {
        console.error('Failed to generate user PKX:', error);
        return null;
      }

      // Get the full leaderboard with accurate rankings
      const leaderboard = await this.getLeaderboard();
      
      // Find user's position in the ranked list
      const userEntry = leaderboard.find(entry => entry.pkx === userPkx);
      return userEntry ? userEntry.rank : null;
    } catch (error) {
      console.error('Failed to get user rank:', error);
      return null;
    }
  }

  // Helper function to fetch all players data in batches
  private async fetchAllPlayersData(): Promise<LeaderboardPlayer[]> {
    const batchSize = 100;
    const maxBatches = 50; // Safety limit to prevent infinite loops
    const allPlayers: LeaderboardPlayer[] = [];
    
    // Fetch batches one by one until we get an empty batch
    for (let i = 0; i < maxBatches; i++) {
      const startIndex = i * batchSize;
      try {
        const response = await fetch(`${this.baseUrl}/data/players/${startIndex}`);
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          console.log(`No more data found at batch ${i} (starting at ${startIndex})`);
          break; // Stop when we hit an empty batch
        }
        
        allPlayers.push(...result.data);
        console.log(`Fetched batch ${i + 1}: ${result.data.length} players (total: ${allPlayers.length})`);
      } catch (error) {
        console.warn(`Error fetching players batch starting at ${startIndex}:`, error);
        break; // Stop on error
      }
    }
    
    console.log(`Fetched ${allPlayers.length} total players from ${Math.ceil(allPlayers.length / batchSize)} batches`);
    return allPlayers;
  }

  // Get leaderboard data (now supports getting all players or limited set)
  async getLeaderboard(start: number = 0, limit?: number): Promise<LeaderboardEntry[]> {
    try {
      let allPlayers: LeaderboardPlayer[];
      
      // If start is 0 and no limit, fetch all players for accurate ranking
      if (start === 0 && !limit) {
        allPlayers = await this.fetchAllPlayersData();
      } else {
        // Fetch single batch for limited queries
        const response = await fetch(`${this.baseUrl}/data/players/${start}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new StakingError("Failed to fetch leaderboard data");
        }
        
        allPlayers = result.data || [];
      }

      // Get current counter from backend global state
      const currentCounter = await this.getGlobalCounter();
      
      const leaderboardEntries = allPlayers
        .filter((player: LeaderboardPlayer) => player.data !== null)
        .map((player: LeaderboardPlayer) => {
          const playerData = player.data!.data;
          const effectivePoints = StakingCalculator.calculateEffectivePoints(
            BigInt(playerData.points),
            BigInt(playerData.total_staked),
            BigInt(playerData.last_stake_time),
            currentCounter,
            BigInt(playerData.last_update_time || 0)
          );
          
          return {
            pkx: player.pkx,
            points: BigInt(playerData.points),
            totalStaked: BigInt(playerData.total_staked),
            lastStakeTime: BigInt(playerData.last_stake_time),
            effectivePoints,
            nonce: player.data!.nonce,
            rank: 0 // Will be set after sorting
          };
        })
        .filter((entry: LeaderboardEntry) => 
          entry.totalStaked > 0n || entry.effectivePoints > 0n
        )
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => 
          a.effectivePoints > b.effectivePoints ? -1 : 
          a.effectivePoints < b.effectivePoints ? 1 : 0
        );

      // Update ranks after sorting and apply limit if specified
      const rankedEntries = leaderboardEntries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      // Apply limit if specified
      if (limit) {
        return rankedEntries.slice(0, limit);
      }

      return rankedEntries;
    } catch (error) {
      handleStakingError(error);
    }
  }

  // Get global statistics (now reuses fetchAllPlayersData)
  async getGlobalStats(): Promise<GlobalState> {
    try {
      // Reuse the existing data fetching logic
      const allPlayers = await this.fetchAllPlayersData();
      
      // Filter active players (those with data)
      const activePlayers = allPlayers.filter((p: LeaderboardPlayer) => p.data !== null);
      
      // Calculate totals
      const totalStaked = activePlayers.reduce((sum: bigint, player: LeaderboardPlayer) => 
        sum + BigInt(player.data!.data.total_staked), 0n);
      const totalPlayers = BigInt(activePlayers.length);
      
      // Get the correct backend counter
      const currentCounter = await this.getGlobalCounter();
      
      return {
        total_staked: totalStaked,
        total_players: totalPlayers,
        counter: currentCounter,
        txsize: 0n, // Not available from leaderboard
        txcounter: 0n // Not available from leaderboard
      };
    } catch (error) {
      handleStakingError(error);
    }
  }

  // Unified data fetching method - gets all data in one call to avoid duplicate API requests
  async getCombinedStakingData(processingKey?: string): Promise<CombinedStakingData> {
    try {
      // Fetch all players data once
      const allPlayers = await this.fetchAllPlayersData();
      const currentCounter = await this.getGlobalCounter();
      
      // Filter active players
      const activePlayers = allPlayers.filter((p: LeaderboardPlayer) => p.data !== null);
      
      // Calculate global stats
      const totalStaked = activePlayers.reduce((sum: bigint, player: LeaderboardPlayer) => 
        sum + BigInt(player.data!.data.total_staked), 0n);
      const totalPlayers = BigInt(activePlayers.length);
      
      const globalStats: GlobalState = {
        total_staked: totalStaked,
        total_players: totalPlayers,
        counter: currentCounter,
        txsize: 0n,
        txcounter: 0n
      };
      
      // Process leaderboard entries - get top 100 by effective points
      const leaderboardEntries = activePlayers
        .map((player: LeaderboardPlayer) => {
          const playerData = player.data!.data;
          const effectivePoints = StakingCalculator.calculateEffectivePoints(
            BigInt(playerData.points),
            BigInt(playerData.total_staked),
            BigInt(playerData.last_stake_time),
            currentCounter,
            BigInt(playerData.last_update_time || 0)
          );
          
          return {
            pkx: player.pkx,
            points: BigInt(playerData.points),
            totalStaked: BigInt(playerData.total_staked),
            lastStakeTime: BigInt(playerData.last_stake_time),
            effectivePoints,
            nonce: player.data!.nonce,
            rank: 0 // Will be set after sorting
          };
        })
        .filter((entry: LeaderboardEntry) => 
          entry.totalStaked > 0n // Only filter by totalStaked > 0, not effectivePoints
        )
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => 
          a.effectivePoints > b.effectivePoints ? -1 : 
          a.effectivePoints < b.effectivePoints ? 1 : 0
        )
        .slice(0, 100) // Limit to top 100
        .map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
      
      // Calculate user rank if processingKey provided (based on full leaderboard, not just top 100)
      let userRank: number | undefined;
      if (processingKey) {
        try {
          const pkey = PrivateKey.fromString(processingKey);
          const pubkey = pkey.publicKey.key.x.v;
          const userPkx = bnToHexLe(pubkey);
          
          // Create full leaderboard for ranking calculation
          const fullLeaderboard = activePlayers
            .map((player: LeaderboardPlayer) => {
              const playerData = player.data!.data;
              const effectivePoints = StakingCalculator.calculateEffectivePoints(
                BigInt(playerData.points),
                BigInt(playerData.total_staked),
                BigInt(playerData.last_stake_time),
                currentCounter,
                BigInt(playerData.last_update_time || 0)
              );
              
              return {
                pkx: player.pkx,
                effectivePoints,
                totalStaked: BigInt(playerData.total_staked)
              };
            })
            .filter(entry => entry.totalStaked > 0n || entry.effectivePoints > 0n)
            .sort((a, b) => 
              a.effectivePoints > b.effectivePoints ? -1 : 
              a.effectivePoints < b.effectivePoints ? 1 : 0
            );
          
          const userIndex = fullLeaderboard.findIndex(entry => entry.pkx === userPkx);
          userRank = userIndex >= 0 ? userIndex + 1 : undefined;
        } catch (error) {
          console.error('Failed to calculate user rank:', error);
        }
      }
      
      return {
        leaderboard: leaderboardEntries,
        globalStats,
        userRank
      };
    } catch (error) {
      handleStakingError(error);
    }
  }

  // Install player (initial setup)
  async installPlayer(userKey: string) {
    const cmd = createCommand(0n, BigInt(INSTALL_PLAYER), []);
    return this.sendTransaction(cmd, userKey);
  }

  // Deposit tokens for user (admin controlled)
  async depositForUser(userPid: [bigint, bigint], amount: bigint, nonce: bigint, adminKey: string) {
    // Deposit command: [pid[0], pid[1], tokenIndex(0), amount]
    const cmd = createCommand(nonce, BigInt(DEPOSIT), [userPid[0], userPid[1], 0n, amount]);
    return this.sendTransaction(cmd, adminKey);
  }

  // Withdraw tokens (user controlled)
  async withdrawTokens(amount: bigint, address: string, nonce: bigint, userKey: string) {
    // Remove 0x prefix from address if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    console.log('Withdraw address processing:', { original: address, cleaned: cleanAddress });
    
    // Withdraw command using createWithdrawCommand
    const cmd = createWithdrawCommand(nonce, BigInt(WITHDRAW), cleanAddress, 0n, amount);
    return this.sendTransaction(cmd, userKey);
  }

  // Withdraw USDT (exchange points for USDT)
  async withdrawUsdt(usdtAmount: bigint, address: string, nonce: bigint, userKey: string) {
    // Remove 0x prefix from address if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    console.log('Withdraw USDT address processing:', { original: address, cleaned: cleanAddress });
    
    // Withdraw USDT command using createWithdrawCommand with token index 1
    const cmd = createWithdrawCommand(nonce, BigInt(WITHDRAW_USDT), cleanAddress, 1n, usdtAmount);
    return this.sendTransaction(cmd, userKey);
  }

  // Withdraw points (exchange points for points)
  async withdrawPoints(pointsAmount: bigint, address: string, nonce: bigint, userKey: string) {
    // Remove 0x prefix from address if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    console.log('Withdraw points address processing:', { original: address, cleaned: cleanAddress });
    
    // Withdraw points command using createWithdrawCommand with token index 2
    const cmd = createWithdrawCommand(nonce, BigInt(WITHDRAW_POINTS), cleanAddress, 2n, pointsAmount);
    return this.sendTransaction(cmd, userKey);
  }

  // Get user's current nonce
  async getUserNonce(userKey: string): Promise<bigint> {
    try {
      const stateData = await this.queryUserState(userKey);
      return BigInt(stateData.player.nonce);
    } catch (error) {
      // If player doesn't exist or has no transactions, start with nonce 0
      if (error instanceof StakingError && 
          (error.message.includes("PlayerNotExist") || 
           error.message.includes("Player not found"))) {
        return 0n;
      }
      throw error;
    }
  }

  // Get user's L1 token balance from contract using wallet provider
  async getL1TokenBalance(userAddress: string, provider?: any): Promise<bigint> {
    try {
      // Support both CRA and Vite environment variable formats
      let tokenContract = 
        import.meta.env?.REACT_APP_TOKEN_CONTRACT;
      
      console.log('Raw token contract from env:', tokenContract);
      
      // Clean up the token contract address by removing quotes
      if (tokenContract) {
        tokenContract = tokenContract.replace(/['"]/g, '').trim();
      }
      
      console.log('Cleaned token contract:', tokenContract);
      
      if (!tokenContract) {
        throw new Error(`Token contract not configured. Got: tokenContract=${tokenContract}`);
      }

      if (!provider) {
        console.warn("No provider available, returning 0 balance");
        return 0n;
      }

      // Validate addresses (ethers v6 API)
      if (!ethers.isAddress(userAddress)) {
        console.warn("Invalid user address:", userAddress);
        return 0n;
      }

      if (!ethers.isAddress(tokenContract)) {
        console.warn("Invalid token contract address:", tokenContract);
        return 0n;
      }

      // Standard ERC20 ABI for balanceOf function
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)"
      ];
      
      // Create contract instance
      const contract = new ethers.Contract(tokenContract, erc20Abi, provider);
      
      // Call balanceOf function with explicit address (ethers v6 API)
      const balance = await contract.balanceOf(ethers.getAddress(userAddress));
      
      return BigInt(balance.toString());
    } catch (error) {
      console.error("Failed to get L1 token balance:", error);
      
      // Handle specific ENS-related errors
      if (error instanceof Error) {
        if (error.message.includes("network does not support ENS") || 
            error.message.includes("UNSUPPORTED_OPERATION")) {
          console.warn("ENS not supported on this network, but this is expected for non-Ethereum networks");
          return 0n;
        }
        
        if (error.message.includes("invalid address")) {
          console.warn("Invalid address provided for balance query");
          return 0n;
        }
      }
      
      // Return 0 if we can't get balance instead of throwing
      return 0n;
    }
  }
}

// Export singleton instance
export const stakingService = new StakingService(); 