import { DelphinusProvider } from '../providers/provider';
import { getChainId } from '../config/env-adapter';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';

/**
 * 验证当前网络是否正确，如果不正确则尝试切换
 * @param provider - Delphinus 提供者实例
 * @returns Promise<void>
 */
export async function validateAndSwitchNetwork(provider: DelphinusProvider): Promise<void> {
  const targetChainId = getChainId();
  const chainHexId = "0x" + targetChainId.toString(16);
  
  try {
    // 尝试切换网络
    await provider.switchNet(chainHexId);
    
    // 验证网络是否切换成功
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
      throw error; // 重新抛出网络切换错误
    }
    throw createError(
      `Failed to validate network: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'NETWORK_VALIDATION_FAILED',
      error
    );
  }
}

/**
 * 检查网络是否匹配目标链ID
 * @param currentChainId - 当前链ID
 * @param targetChainId - 目标链ID (可选，默认从环境变量获取)
 * @returns boolean
 */
export function isNetworkMatch(currentChainId: number | string, targetChainId?: number): boolean {
  const target = targetChainId || getChainId();
  return currentChainId.toString() === target.toString();
}

/**
 * 格式化链ID为十六进制
 * @param chainId - 链ID
 * @returns 十六进制字符串 (以0x开头)
 */
export function formatChainIdToHex(chainId: number): string {
  return "0x" + chainId.toString(16);
} 