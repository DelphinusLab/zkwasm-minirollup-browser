import { createSlice } from '@reduxjs/toolkit';
import { getConfig, sendTransaction, queryState, queryInitialState, sendExtrinsicTransaction } from "./rpc-thunks";

export enum ConnectState{
	Init,
	OnStart,
	Preloading,
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
		isConnected: boolean;
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
			setLastTransactionError: (state, action) => {
				state.lastError = action.payload;
			},
		},

		extraReducers: (builder) => {
			builder
				.addCase(getConfig.pending, (state, _action) => {
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
				.addCase(sendTransaction.pending, (state, _action) => {
					state.connectState = ConnectState.WaitingTxReply;
				})
				.addCase(sendTransaction.fulfilled, (state, action) => {
					const loadedState = action.payload.state;
					const loadedPlayer = action.payload.player;
					state.userState = {
						player: loadedPlayer,
						state: loadedState,
					}
					if(action.payload.player != null) {
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
				.addCase(sendExtrinsicTransaction.pending, (state, _action) => {
					state.connectState = ConnectState.WaitingTxReply;
				})
				.addCase(sendExtrinsicTransaction.fulfilled, (_state, _action) => {
					console.log("extrinsic message sent");
				})
				.addCase(sendExtrinsicTransaction.rejected, (state, action) => {
					state.lastError = {
						errorInfo:`send extrinsic transaction rejected: ${action.payload}`,
						payload: action.payload,
					}
				})
				.addCase(queryState.pending, (state, _action) => {
					state.connectState = ConnectState.QueryState;
				})
				.addCase(queryState.fulfilled, (state, action) => {
					const loadedState = action.payload.state;
					const loadedPlayer = action.payload.player;
					state.userState = {
						player: loadedPlayer,
						state: loadedState,
					}
					if(action.payload.player != null) {
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
					if(state.userState) {
						state.userState.state = loadedState;
					} else {
						state.userState = {
							player: null,
							state: loadedState
						}
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
