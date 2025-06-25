import { signMessageWithRainbowKit, switchNetworkWithRainbowKit } from "./address.js";
import { getRpc, getRpcUrl, setRpcUrl } from "./connect.js";
import { RainbowKitAdapter, useRainbowKitAdapter, withRainbowKitConnector } from "./rainbow-adapter.js";
import { ConnectState, createStateSlice, PropertiesState, RequestError } from "./reduxconnect.js";
import AccountSliceReducer, * as AccountSlice from "./reduxstate.js";
import { wagmiConfig } from "./wagmi-config.js";

// Legacy exports
export {
    AccountSlice,
    AccountSliceReducer,
    ConnectState,
    createStateSlice,
    getRpc,
    getRpcUrl,
    RainbowKitAdapter,
    setRpcUrl,
    signMessageWithRainbowKit,
    switchNetworkWithRainbowKit,
    useRainbowKitAdapter,
    wagmiConfig,
    withRainbowKitConnector
};
export type { PropertiesState, RequestError };

// New zkWasm SDK exports
    export {
        // Reducer
        default as accountReducer,
        // Complete wallet connection and login flow
        connectWalletAndLoginL1WithHooksAsync,
        // Utility functions
        createRainbowKitHooks,
        // React Hooks
        createZkWasmWalletHook, depositAsync, depositWithRainbowKitAsync, loginL1AccountAsync,
        // RainbowKit versions
        loginL1AccountWithRainbowKitAsync, loginL2AccountAsync, loginL2AccountWithRainbowKitAsync,
        // State management
        resetAccountState,
        // Selectors
        selectL1Account,
        selectL2Account,
        selectLoginStatus,
        // Types
        type AccountState,
        type L1AccountInfo, type L2AccountData, type L2AccountInfo, type RainbowKitHooks, type State
    } from './reduxstate.js';

// Pre-configured React Hook - ready to use
export { useZkWasmWallet } from './zkwasm-hooks.js';

