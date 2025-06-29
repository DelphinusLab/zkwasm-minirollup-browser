import { createSlice } from '@reduxjs/toolkit';
import { AccountState } from '../types';
import { 
  loginL1AccountAsync, 
  loginL2AccountAsync, 
  depositAsync, 
  connectWalletAndLoginL1WithHooksAsync 
} from './thunks';

const initialState: AccountState = {
  status: 'Ready',
};

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setL1Account: (state, action) => {
      state.l1Account = action.payload;
    },
    resetAccountState: (state) => {
      state.l1Account = undefined;
      state.l2account = undefined;
      state.status = 'Ready';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginL1AccountAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountAsync.fulfilled, (state, c) => {
        state.status = 'LoadingL2';
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })
      .addCase(loginL2AccountAsync.pending, (state) => {
        state.status = 'LoadingL2';
      })
      .addCase(loginL2AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c);
        state.l2account = c.payload;
      })
      .addCase(depositAsync.pending, (state) => {
        state.status = 'Deposit';
        console.log("deposit async is pending ....");
      })
      .addCase(depositAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c.payload);
      })
      // Complete connection and login flow
      .addCase(connectWalletAndLoginL1WithHooksAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // Should be Ready state after successful L1 login
        state.l1Account = c.payload;
      })
      .addCase(connectWalletAndLoginL1WithHooksAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })
  },
});

export const { setL1Account, resetAccountState } = accountSlice.actions;
export default accountSlice.reducer; 