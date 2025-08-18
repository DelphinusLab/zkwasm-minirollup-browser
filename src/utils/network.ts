import { DelphinusProvider } from '../providers/provider';
import { getChainId } from '../config/env-adapter';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * Network configuration for common chains
 */
const NETWORK_CONFIGS: Record<number, {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}> = {
  56: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed1.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com/"],
  },
  // Add more networks as needed
};

/**
 * Add network to MetaMask if not already configured
 * @param provider - Delphinus provider instance
 * @param chainId - Chain ID to add
 * @returns Promise<boolean> - true if network was added or already exists
 */
async function addNetworkToWallet(provider: DelphinusProvider, chainId: number): Promise<boolean> {
  const networkConfig = NETWORK_CONFIGS[chainId];
  if (!networkConfig) {
    console.warn(`No network configuration available for chain ID ${chainId}`);
    return false;
  }

  try {
    console.log(`📡 Adding network ${networkConfig.chainName} (${chainId}) to wallet...`);
    
    // Try to add the network to MetaMask
    await (provider as any).provider.send("wallet_addEthereumChain", [networkConfig]);
    
    console.log(`✅ Network ${networkConfig.chainName} added successfully`);
    return true;
  } catch (addError: any) {
    console.error(`❌ Failed to add network ${networkConfig.chainName}:`, addError);
    
    // If user rejects, that's okay - they can add it manually
    if (addError?.code === 4001) {
      console.log('User rejected adding network');
      return false;
    }
    
    // If network already exists, that's fine too
    if (addError?.code === -32602) {
      console.log('Network already exists in wallet');
      return true;
    }
    
    return false;
  }
}

/**
 * Validate current network and switch if incorrect
 * @param provider - Delphinus provider instance
 * @returns Promise<void>
 */
export async function validateAndSwitchNetwork(provider: DelphinusProvider): Promise<void> {
  const targetChainId = getChainId();
  const chainHexId = "0x" + targetChainId.toString(16);
  
  console.log(`🔄 validateAndSwitchNetwork: target chain ${targetChainId} (${chainHexId})`);
  
  try {
    // Attempt to switch network
    console.log(`📡 Calling provider.switchNet(${chainHexId})...`);
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
  } catch (error: any) {
    // If network is not configured (4902), try to add it automatically
    // Check both direct error code and nested error (ethers.js wrapping)
    const isNetworkNotConfigured = error?.code === 4902 || 
                                   error?.error?.code === 4902 ||
                                   error?.message?.includes('Unrecognized chain ID') ||
                                   error?.message?.includes('Try adding the chain');
    
    if (isNetworkNotConfigured) {
      console.log(`🔧 Network ${targetChainId} not configured, attempting to add it...`);
      
      const networkAdded = await addNetworkToWallet(provider, targetChainId);
      if (networkAdded) {
        // Try to switch again after adding the network
        try {
          await provider.switchNet(chainHexId);
          console.log(`✅ Successfully switched to network ${targetChainId} after adding it`);
          return;
        } catch (switchError) {
          console.error('Failed to switch after adding network:', switchError);
        }
      }
    }
    
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