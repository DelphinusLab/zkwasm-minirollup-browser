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
      state.status = 'Ready';  // 设置 L1 账户时状态应该是 Ready
    },
    resetAccountState: (state) => {
      state.l1Account = undefined;
      state.l2account = undefined;
      state.status = 'Initial';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginL1AccountAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';  // L1 登录完成后应该是 Ready 状态
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountAsync.rejected, (state, _c) => {
        state.status = 'L1AccountError';
      })
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
      .addCase(depositAsync.pending, (state) => {
        state.status = 'Deposit';
      })
      .addCase(depositAsync.fulfilled, (state, _c) => {
        state.status = 'Ready';
      })
      .addCase(depositAsync.rejected, (state, _c) => {
        state.status = 'Ready';  // 存款失败后回到Ready状态，保持账户可用
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