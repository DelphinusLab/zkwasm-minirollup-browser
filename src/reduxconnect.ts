import { createSlice } from '@reduxjs/toolkit';
import { getConfig, sendTransaction, queryState, queryInitialState } from "./connect.js";

export enum ConnectState{
  Init,
  Loading,
  Idle,
  InstallPlayer,
  QueryConfig,
  QueryState,
  ConnectionError,
  WaitingTxReply,
  WaitingDepositReply,
}

export interface RequestError {
  errorInfo: string,
  payload: any,
}

interface UserState<PlayerInfo, GlobalState> {
  player: PlayerInfo | null,
  state: GlobalState,
}

export interface PropertiesState<PlayerInfo, GlobalState, Config> {
    connectState: ConnectState;
    userState: UserState<PlayerInfo, GlobalState> | null;
    lastError: RequestError | null,
    config: Config | null,
}

export function createStateSlice<PlayerInfo, GlobalState, Config>(initialState: PropertiesState<PlayerInfo, GlobalState, Config>) {
  const propertiesSlice = createSlice({
    name: 'properties',
    initialState,
    reducers: {
      setConnectState: (state, action) => {
        state.connectState = action.payload;
      },
    },

    extraReducers: (builder) => {
      builder
        .addCase(getConfig.pending, (state, action) => {
          state.connectState = ConnectState.QueryConfig;
        })
        .addCase(getConfig.fulfilled, (state, action) => {
          state.connectState = ConnectState.Idle;
          state.config = action.payload;
        })
        .addCase(getConfig.rejected, (state, action) => {
          state.lastError = {
            errorInfo: `query config rejected: ${action.payload}`,
            payload: action.payload,
          }
        })
        .addCase(sendTransaction.pending, (state, action) => {
          state.connectState == ConnectState.WaitingTxReply;
        })
        .addCase(sendTransaction.fulfilled, (state, action) => {
          const loadedState = action.payload.state;
          const loadedPlayer = action.payload.player;
          state.userState = {
            player: loadedPlayer,
            state: loadedState,
          }
          if(loadedPlayer != null) {
            state.connectState = ConnectState.Idle;
          } else {
            state.connectState = ConnectState.InstallPlayer;
          }
        })
        .addCase(sendTransaction.rejected, (state, action) => {
          state.lastError = {
            errorInfo:`send transaction rejected: ${action.payload}`,
            payload: action.payload,
          }
        })
        .addCase(queryState.fulfilled, (state, action) => {
          const loadedState = action.payload.state;
          const loadedPlayer = action.payload.player;
          state.userState = {
            player: loadedPlayer,
            state: loadedState,
          }
          if(loadedPlayer != null) {
            state.connectState = ConnectState.Idle;
          } else {
            state.connectState = ConnectState.InstallPlayer;
          }
        })
        .addCase(queryState.rejected, (state, action) => {
          state.lastError = {
            errorInfo: `query state rejected: ${action.payload}`,
            payload: action.payload,
          }
          state.connectState = ConnectState.ConnectionError;
        })
        .addCase(queryInitialState.fulfilled, (state, action) => {
          const loadedState = action.payload.state;
          state.userState = {
            player: null,
            state: loadedState,
          }
        })
        .addCase(queryInitialState.rejected, (state, action) => {
          state.connectState = ConnectState.ConnectionError;
          state.lastError = {
            errorInfo: `query state rejected: ${action.payload}`,
            payload: action.payload,
          }
        });

    }
  });
  return propertiesSlice;
}
