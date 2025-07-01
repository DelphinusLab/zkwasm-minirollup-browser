import { DelphinusProvider } from '../providers/provider';
import { getChainId } from '../config/env-adapter';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * Validate current network and switch if incorrect
 * @param provider - Delphinus provider instance
 * @returns Promise<void>
 */
export async function validateAndSwitchNetwork(provider: DelphinusProvider): Promise<void> {
  const targetChainId = getChainId();
  const chainHexId = "0x" + targetChainId.toString(16);
  
  try {
    // Attempt to switch network
    await provider.switchNet(chainHexId);
    
    // Verify if network switch was successful
    const currentNetwork = await provider.getNetworkId();
    if (currentNetwork.toString() !== targetChainId.toString()) {
      console.error(`Network mismatch: expected ${targetChainId}, got ${currentNetwork.toString()}`);
      throw createError(
        ERROR_MESSAGES.NETWORK_MISMATCH(targetChainId, currentNetwork.toString()),
        'NETWORK_MISMATCH'
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('switch')) {
      throw error; // Re-throw network switch errors
    }
    throw createError(
      `Failed to validate network: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_VALIDATION_FAILED',
      error
    );
  }
}

/**
 * Check if network matches target chain ID
 * @param currentChainId - Current chain ID
 * @param targetChainId - Target chain ID (optional, defaults to environment variable value)
 * @returns boolean
 */
export function isNetworkMatch(currentChainId: number | string, targetChainId?: number): boolean {
  const target = targetChainId || getChainId();
  return currentChainId.toString() === target.toString();
}

/**
 * Format chain ID to hexadecimal
 * @param chainId - Chain ID
 * @returns Hexadecimal string (prefixed with 0x)
 */
export function formatChainIdToHex(chainId: number): string {
  return "0x" + chainId.toString(16);
} 