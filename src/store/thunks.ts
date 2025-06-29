import { createAsyncThunk } from '@reduxjs/toolkit';
import { getChainId } from '../config/env-adapter';
import { L1AccountInfo, RainbowKitHooks } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';
import { loginL1Account, loginL2Account, deposit } from '../services';

export const loginL1AccountAsync = createAsyncThunk(
  'acccount/fetchAccount',
  async (thunkApi) => {
    const account = await loginL1Account();
    return account;
  }
);

export const loginL2AccountAsync = createAsyncThunk(
  'acccount/deriveL2Account',
  async (appName: string, thunkApi) => {
    const l2account = await loginL2Account(appName);
    return l2account;  // Return L2AccountInfo instance directly
  }
);

export const depositAsync = createAsyncThunk(
  'acccount/deposit',
  async (params: {
    tokenIndex: number, 
    amount: number, 
    l2account: L2AccountInfo, 
    l1account: L1AccountInfo
  }, thunkApi) => {
    const txReceipt = await deposit(getChainId(), params.tokenIndex, params.amount, params.l2account, params.l1account);
    
    if (!txReceipt) {
      throw new Error('Transaction failed: no receipt received');
    }
    
    return txReceipt;
  }
);

// Complete wallet connection and L1 login flow
export const connectWalletAndLoginL1Async = createAsyncThunk(
  'account/connectAndLoginL1',
  async (_, thunkApi) => {
    // This function needs to be called from React component because it requires hooks
    throw new Error('This function should be called from a React component with RainbowKit hooks');
  }
);

// Connection function for external use, requires RainbowKit hooks
export const connectWalletAndLoginL1WithHooksAsync = createAsyncThunk(
  'account/connectAndLoginL1WithHooks',
  async (rainbowKitHooks: RainbowKitHooks, thunkApi) => {
    // If wallet is not connected, try to connect first
    if (!rainbowKitHooks.isConnected || !rainbowKitHooks.address) {
      // Prefer using openConnectModal
      if (rainbowKitHooks.openConnectModal) {
        rainbowKitHooks.openConnectModal();
        throw new Error('Please connect your wallet using the modal');
      }
      
      // Fallback: try to auto-connect first connector
      if (rainbowKitHooks.connect && rainbowKitHooks.connectors && rainbowKitHooks.connectors.length > 0) {
        try {
          rainbowKitHooks.connect({ connector: rainbowKitHooks.connectors[0] });
          // Connection is async but function returns immediately, so we wait for connection state update
          throw new Error('Wallet connection initiated. Please wait for connection to complete and try again.');
        } catch (connectError) {
          console.error('Auto-connect failed:', connectError);
          throw new Error('Failed to connect wallet automatically. Please connect manually.');
        }
      } else {
        throw new Error('No wallet connection method available. Please ensure RainbowKit is properly configured.');
      }
    }
    const account = await loginL1Account();
    return account;
  }
); 