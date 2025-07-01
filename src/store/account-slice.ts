import { createSlice } from '@reduxjs/toolkit';
import { AccountState } from '../types';
import { 
  loginL1AccountAsync, 
  loginL2AccountAsync, 
  depositAsync, 
  connectWalletAndLoginL1WithHooksAsync 
} from './thunks';

const initialState: AccountState = {
  status: 'Initial',
};

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setL1Account: (state, action) => {
      state.l1Account = action.payload;
      state.status = 'Ready';  // State should be Ready when setting L1 account
    },
    resetAccountState: (state) => {
      state.l1Account = undefined;
      state.l2account = undefined;
      state.status = 'Initial';
    },
  },
  extraReducers: (builder) => {
    builder
      // L1 Account Login
      .addCase(loginL1AccountAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // Should be Ready state after L1 login completion
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountAsync.rejected, (state, _c) => {
        state.status = 'L1AccountError';
      })
      
      // L2 Account Derivation
      .addCase(loginL2AccountAsync.pending, (state) => {
        state.status = 'LoadingL2';
      })
      .addCase(loginL2AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        state.l2account = c.payload;
      })
      .addCase(loginL2AccountAsync.rejected, (state, _c) => {
        state.status = 'L2AccountError';
      })
      
      // Deposit
      .addCase(depositAsync.pending, (state) => {
        state.status = 'Deposit';
      })
      .addCase(depositAsync.fulfilled, (state, _c) => {
        state.status = 'Ready';
      })
      .addCase(depositAsync.rejected, (state, _c) => {
        state.status = 'Ready';  // Return to Ready state after deposit failure, keep account available
      })
      // Complete connection and login flow
      .addCase(connectWalletAndLoginL1WithHooksAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // Should be Ready state after successful L1 login
        state.l1Account = c.payload;
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.rejected, (state, _c) => {
        state.status = 'L1AccountError';
      })
  },
});

export const { setL1Account, resetAccountState } = accountSlice.actions;
export default accountSlice.reducer; 