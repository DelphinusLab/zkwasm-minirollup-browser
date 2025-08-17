// ZKWASM Staking Platform Utilities

/**
 * Calculate effective points based on staking formula
 * effectivePoints = basePoints + (totalStaked * (currentCounter - lastStakeTime))
 */
export const calculateEffectivePoints = (
  basePoints: bigint,
  totalStaked: bigint,
  lastStakeTime: bigint,
  currentCounter: bigint
): bigint => {
  if (lastStakeTime === 0n || currentCounter <= lastStakeTime) {
    return basePoints;
  }
  const deltaTime = currentCounter - lastStakeTime;
  const interest = totalStaked * deltaTime;
  return basePoints + interest;
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 */
export const formatNumber = (value: number | bigint): string => {
  const num = typeof value === 'bigint' ? Number(value) : value;
  
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format BigInt values for display
 */
export const formatBigInt = (value: bigint, decimals = 0): string => {
  if (decimals === 0) {
    return formatNumber(value);
  }
  
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  
  // For token amounts (like 18 decimals), only show whole numbers
  if (decimals === 18) {
    return formatNumber(whole);
  }
  
  // For other decimal cases, show decimal places
  const remainder = value % divisor;
  if (remainder === 0n) {
    return formatNumber(whole);
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  return `${formatNumber(whole)}.${remainderStr}`;
};

/**
 * Format effective points by dividing by 17280 for display
 */
export const formatEffectivePoints = (points: bigint): string => {
  const adjustedPoints = points / 17280n;
  return formatNumber(adjustedPoints);
};

/**
 * Truncate wallet address for display
 */
export const truncateAddress = (address: string, chars = 4): string => {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Get current timestamp as BigInt
 */
export const getCurrentCounter = (): bigint => {
  return BigInt(Math.floor(Date.now() / 1000));
};

/**
 * Format timestamp to readable date
 */
export const formatTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Calculate time difference in human readable format
 */
export const getTimeAgo = (timestamp: bigint): string => {
  const now = getCurrentCounter();
  const diff = Number(now - timestamp);
  
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/**
 * Validate stake amount
 */
export const validateStakeAmount = (
  amount: string,
  balance: bigint,
  minStake: bigint = 1n,
  maxStake: bigint = BigInt(1_000_000_000)
): { valid: boolean; error?: string } => {
  try {
    const value = BigInt(amount);
    
    if (value <= 0n) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }
    
    if (value < minStake) {
      return { valid: false, error: `Minimum stake is ${formatBigInt(minStake)}` };
    }
    
    if (value > maxStake) {
      return { valid: false, error: `Maximum stake is ${formatBigInt(maxStake)}` };
    }
    
    if (value > balance) {
      return { valid: false, error: 'Insufficient balance' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid amount format' };
  }
};

/**
 * Generate mock processing key for testing
 */
export const generateMockProcessingKey = (): string => {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/**
 * Color palette for charts
 */
export const chartColors = {
  primary: 'hsl(270, 91%, 65%)',
  accent: 'hsl(200, 100%, 60%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(47, 96%, 53%)',
  gradient: ['hsl(270, 91%, 65%)', 'hsl(240, 100%, 70%)', 'hsl(200, 100%, 60%)']
};