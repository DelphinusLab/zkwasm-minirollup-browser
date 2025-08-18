import { DelphinusProvider } from '../providers/provider';
import { getEnvConfig } from '../config/env-adapter';
import { contractABI } from '../contracts/abi';
import { ERROR_MESSAGES } from './constants';
import { createError } from './errors';
import { validateCurrentNetwork } from './network';
import { toWei, calculatePidArray, hasSufficientBalance, BN } from './crypto';
import { L1AccountInfo, SerializableTransactionReceipt } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

/**
 * Get contract address configuration
 * @returns Contract address configuration
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
 * Check and execute token approval
 * @param provider - Provider instance
 * @param tokenAddr - Token contract address
 * @param proxyAddr - Proxy contract address
 * @param l1account - L1 account information
 * @param amountWei - Amount to approve (in Wei)
 */
export async function checkAndApproveToken(
  provider: DelphinusProvider,
  tokenAddr: string,
  proxyAddr: string,
  l1account: L1AccountInfo,
  amountWei: any
): Promise<void> {
  // Get contract instance
  const tokenContract = await provider.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
  const tokenContractReader = provider.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
  
  // Check balance and allowance
  const balanceEthers = await tokenContractReader.getEthersContract().balanceOf(l1account.address);
  const allowanceEthers = await tokenContractReader.getEthersContract().allowance(l1account.address, proxyAddr);
  
  // Convert to BN.js format for comparison
  const balance = new BN(balanceEthers.toString());
  const allowance = new BN(allowanceEthers.toString());
  
  console.log("Token balance:", balance.toString());
  console.log("Token allowance:", allowance.toString());
  console.log("Required amount:", amountWei.toString());
  
  // If allowance is insufficient, approve first
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
 * Execute deposit transaction
 * @param provider - Provider instance
 * @param params - Deposit parameters
 * @returns Transaction receipt
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

  await validateCurrentNetwork(provider);
  
  const { proxyAddr, tokenAddr } = getContractAddresses();
  
  // Calculate amount and PID
  const amountWei = toWei(params.amount);
  const pkeyArray = calculatePidArray(params.l2account.pubkey);
  
  console.log('Deposit: contract addresses', { proxyAddr, tokenAddr });
  console.log('Deposit: amount in wei:', amountWei.toString());
  
  // Check and approve token
  await checkAndApproveToken(provider, tokenAddr, proxyAddr, params.l1account, amountWei);
  
  // Execute deposit transaction
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