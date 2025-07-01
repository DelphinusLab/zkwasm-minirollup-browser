import BN from 'bn.js';
import { bnToHexLe } from 'delphinus-curves/src/altjubjub';
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { NUMERIC_CONSTANTS } from './constants';

// Common numeric constants
export const WEI_MULTIPLIER = new BN("10").pow(new BN(NUMERIC_CONSTANTS.DECIMALS));

/**
 * Convert number to Wei unit
 * @param amount - Original number
 * @returns BN - Number in Wei unit
 */
export function toWei(amount: number | string | BN): BN {
  const amountBN = new BN(amount);
  return amountBN.mul(WEI_MULTIPLIER);
}

/**
 * Convert Wei to Ether unit
 * @param weiAmount - Number in Wei unit
 * @returns BN - Number in Ether unit
 */
export function fromWei(weiAmount: BN): BN {
  return weiAmount.div(WEI_MULTIPLIER);
}

/**
 * Calculate L2 account PID array
 * @param pubkey - Public key
 * @returns Calculated PID array
 */
export function calculatePidArray(pubkey: BN) {
  const leHexBN = new LeHexBN(bnToHexLe(pubkey));
  return leHexBN.toU64Array();
}

/**
 * Format balance display
 * @param balance - Balance (in Wei unit)
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatBalance(balance: BN, decimals: number = 4): string {
  const etherBalance = fromWei(balance);
  const divisor = new BN(10).pow(new BN(decimals));
  const rounded = etherBalance.div(divisor).mul(divisor);
  return rounded.toString();
}

/**
 * Check if balance is sufficient
 * @param balance - Current balance
 * @param required - Required amount
 * @returns boolean
 */
export function hasSufficientBalance(balance: BN, required: BN): boolean {
  return balance.gte(required);
}

// Re-export common crypto libraries
export { BN, bnToHexLe, LeHexBN }; 