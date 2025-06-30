import { withProvider } from "../providers/provider";
import { validateAndSwitchNetwork, executeDeposit } from '../utils';
import { L1AccountInfo, SerializableTransactionReceipt } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

export async function deposit(
  _chainId: number, 
  tokenIndex: number, 
  amount: number, 
  l2account: L2AccountInfo, 
  l1account: L1AccountInfo
): Promise<SerializableTransactionReceipt> {
  return await withProvider(async (provider) => {
    // 验证并切换网络
    await validateAndSwitchNetwork(provider);
    
    // 执行存款操作
    return await executeDeposit(provider, {
      tokenIndex,
      amount,
      l2account,
      l1account
    });
  });
} 