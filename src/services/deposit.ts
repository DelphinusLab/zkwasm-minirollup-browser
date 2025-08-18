import { withProvider } from "../providers/provider";
import { validateAndSwitchNetwork, executeDeposit } from '../utils';
import { L1AccountInfo, SerializableTransactionReceipt } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

export async function deposit(
  chainId: number, 
  tokenIndex: number, 
  amount: number, 
  l2account: L2AccountInfo, 
  l1account: L1AccountInfo
): Promise<SerializableTransactionReceipt> {
  return await withProvider(async (provider) => {
    // Try to validate and switch network, but don't fail deposit if network switch fails
    try {
      await validateAndSwitchNetwork(provider);
      console.log('✅ Network validation and switch successful for deposit service');
    } catch (networkError) {
      console.warn('⚠️ Network switch failed for deposit service, but continuing with current network:', networkError);
      // Note: Deposit might fail if on wrong network, but that will be handled by the contract call
    }
    
    // Execute deposit operation
    return await executeDeposit(provider, {
      tokenIndex,
      amount,
      l2account,
      l1account
    });
  });
} 