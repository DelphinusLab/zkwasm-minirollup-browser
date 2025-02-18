import { createSlice, Draft } from '@reduxjs/toolkit';
import { getConfig, sendTransaction, queryState, queryInitialState, sendExtrinsicTransaction } from "./connect.js";

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
}

interface UserState<PlayerInfo, GlobalState> {
	player: PlayerInfo,
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
					}
				})
				.addCase(sendTransaction.pending, (state, action) => {
					state.connectState = ConnectState.WaitingTxReply;
				})
				.addCase(sendTransaction.fulfilled, (state, action) => {
					const loadedState = action.payload.state ?? {} as Draft<GlobalState>;
					const loadedPlayer = action.payload.player ?? {} as Draft<PlayerInfo>;
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
					}
				})
				.addCase(sendExtrinsicTransaction.pending, (state, action) => {
					state.connectState = ConnectState.WaitingTxReply;
				})
				.addCase(sendExtrinsicTransaction.fulfilled, (state, action) => {
					console.log("extrinsic message sent");
				})
				.addCase(sendExtrinsicTransaction.rejected, (state, action) => {
					state.lastError = {
						errorInfo:`send extrinsic transaction rejected: ${action.payload}`,
					}
				})
				.addCase(queryState.pending, (state, action) => {
					state.connectState = ConnectState.QueryState;
				})
				.addCase(queryState.fulfilled, (state, action) => {
					const loadedState = action.payload.state ?? {} as Draft<GlobalState>;
					const loadedPlayer = action.payload.player ?? {} as Draft<PlayerInfo>;
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
					}
					state.connectState = ConnectState.ConnectionError;
				})
				.addCase(queryInitialState.fulfilled, (state, action) => {
					const loadedState = action.payload.state ?? {} as Draft<GlobalState>;
					if(state.userState) {
						state.userState.state = loadedState;
					} else {
						state.userState = {
							player: {} as Draft<PlayerInfo>,
							state: loadedState
						}
					}
				})
				.addCase(queryInitialState.rejected, (state, action) => {
					state.connectState = ConnectState.ConnectionError;
					state.lastError = {
						errorInfo: `query state rejected: ${action.payload}`,
					}
				});

		}
	});
	return propertiesSlice;
}
