import BN from 'bn.js';
import { bnToHexLe } from 'delphinus-curves/src/altjubjub';
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { NUMERIC_CONSTANTS } from './constants';

// 常用的数值常量
export const WEI_MULTIPLIER = new BN("10").pow(new BN(NUMERIC_CONSTANTS.DECIMALS));

/**
 * 将数值转换为 Wei 单位
 * @param amount - 原始数值
 * @returns BN - Wei 单位的数值
 */
export function toWei(amount: number | string | BN): BN {
  const amountBN = new BN(amount);
  return amountBN.mul(WEI_MULTIPLIER);
}

/**
 * 将 Wei 转换为 Ether 单位
 * @param weiAmount - Wei 单位的数值
 * @returns BN - Ether 单位的数值
 */
export function fromWei(weiAmount: BN): BN {
  return weiAmount.div(WEI_MULTIPLIER);
}

/**
 * 计算 L2 账户的 PID 数组
 * @param pubkey - 公钥
 * @returns 计算后的 PID 数组
 */
export function calculatePidArray(pubkey: BN) {
  const leHexBN = new LeHexBN(bnToHexLe(pubkey));
  return leHexBN.toU64Array();
}

/**
 * 格式化余额显示
 * @param balance - 余额（Wei 单位）
 * @param decimals - 小数位数
 * @returns 格式化后的字符串
 */
export function formatBalance(balance: BN, decimals: number = 4): string {
  const etherBalance = fromWei(balance);
  const divisor = new BN(10).pow(new BN(decimals));
  const rounded = etherBalance.div(divisor).mul(divisor);
  return rounded.toString();
}

/**
 * 检查余额是否充足
 * @param balance - 当前余额
 * @param required - 需要的数量
 * @returns boolean
 */
export function hasSufficientBalance(balance: BN, required: BN): boolean {
  return balance.gte(required);
}

// 重新导出常用的加密库
export { BN, bnToHexLe, LeHexBN }; 