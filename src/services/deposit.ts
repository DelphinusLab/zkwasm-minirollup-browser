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
    // Validate and switch network
    await validateAndSwitchNetwork(provider);
    
    // Execute deposit operation
    return await executeDeposit(provider, {
      tokenIndex,
      amount,
      l2account,
      l1account
    });
  });
} 