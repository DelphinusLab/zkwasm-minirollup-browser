import { DelphinusProvider } from '../providers/provider';
import { getEnvConfig } from '../config/env-adapter';
import { contractABI } from '../contracts/abi';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';
import { toWei, calculatePidArray, hasSufficientBalance, BN } from './crypto';
import { L1AccountInfo, SerializableTransactionReceipt } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

/**
 * 获取合约地址配置
 * @returns 合约地址配置
 */
export function getContractAddresses() {
  const envConfig = getEnvConfig();
  const proxyAddr = envConfig.depositContract;
  const tokenAddr = envConfig.tokenContract;
  
  if (!proxyAddr || !tokenAddr) {
    throw createError(ERROR_MESSAGES.CONTRACT_NOT_CONFIGURED, 'CONTRACT_NOT_CONFIGURED');
  }
  
  return { proxyAddr, tokenAddr };
}

/**
 * 检查并执行代币授权
 * @param provider - Provider 实例
 * @param tokenAddr - 代币合约地址
 * @param proxyAddr - 代理合约地址
 * @param l1account - L1账户信息
 * @param amountWei - 需要授权的金额（Wei单位）
 */
export async function checkAndApproveToken(
  provider: DelphinusProvider,
  tokenAddr: string,
  proxyAddr: string,
  l1account: L1AccountInfo,
  amountWei: any
): Promise<void> {
  // 获取合约实例
  const tokenContract = await provider.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
  const tokenContractReader = provider.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
  
  // 检查余额和授权额度
  const balanceEthers = await tokenContractReader.getEthersContract().balanceOf(l1account.address);
  const allowanceEthers = await tokenContractReader.getEthersContract().allowance(l1account.address, proxyAddr);
  
  // 转换为 BN.js 格式以便比较
  const balance = new BN(balanceEthers.toString());
  const allowance = new BN(allowanceEthers.toString());
  
  console.log("Token balance:", balance.toString());
  console.log("Token allowance:", allowance.toString());
  console.log("Required amount:", amountWei.toString());
  
  // 如果授权不足，先进行授权
  if (allowance.lt(amountWei)) {
    console.log("Need to approve, current allowance insufficient");
    
    if (!hasSufficientBalance(balance, amountWei)) {
      throw createError(
        ERROR_MESSAGES.INSUFFICIENT_BALANCE(amountWei.toString(), balance.toString()),
        'INSUFFICIENT_BALANCE'
      );
    }
    
    console.log("Approving token spend...");
    const tx = await tokenContract.getEthersContract().approve(proxyAddr, balanceEthers);
    console.log("Approval transaction sent:", tx.hash);
    await tx.wait();
    console.log("Approval transaction confirmed");
  }
}

/**
 * 执行存款交易
 * @param provider - Provider 实例
 * @param params - 存款参数
 * @returns 交易收据
 */
export async function executeDeposit(
  provider: DelphinusProvider,
  params: {
    tokenIndex: number;
    amount: number;
    l2account: L2AccountInfo;
    l1account: L1AccountInfo;
  }
): Promise<SerializableTransactionReceipt> {
  const { proxyAddr, tokenAddr } = getContractAddresses();
  
  // 计算金额和PID
  const amountWei = toWei(params.amount);
  const pkeyArray = calculatePidArray(params.l2account.pubkey);
  
  console.log('Deposit: contract addresses', { proxyAddr, tokenAddr });
  console.log('Deposit: amount in wei:', amountWei.toString());
  
  // 检查并授权代币
  await checkAndApproveToken(provider, tokenAddr, proxyAddr, params.l1account, amountWei);
  
  // 执行存款交易
  const proxyContract = await provider.getContractWithSigner(proxyAddr, JSON.stringify(contractABI.proxyABI));
  
  console.log("Calling topup function with params:", {
    tokenIndex: Number(params.tokenIndex),
    pid1: pkeyArray[1],
    pid2: pkeyArray[2], 
    amount: BigInt(amountWei.toString())
  });
  
  const tx = await proxyContract.getEthersContract().topup(
    Number(params.tokenIndex),
    pkeyArray[1],
    pkeyArray[2],
    BigInt(amountWei.toString()),
  );
  
  console.log("Topup transaction sent:", tx.hash);
  const txReceipt = await tx.wait();
  console.log("Topup transaction confirmed:", txReceipt);
  
  return {
    hash: txReceipt.hash,
    blockNumber: txReceipt.blockNumber,
    blockHash: txReceipt.blockHash,
    gasUsed: txReceipt.gasUsed?.toString(),
    status: txReceipt.status,
    to: txReceipt.to,
    from: txReceipt.from
  };
} 