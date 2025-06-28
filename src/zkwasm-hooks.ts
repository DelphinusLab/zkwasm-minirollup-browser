// DEPRECATED: This file is deprecated in favor of the new Provider pattern
// Please use the useZkWasmWallet hook from reduxstate.ts instead
// 
// This file is kept for backward compatibility only
// External projects should migrate to:
// import { useZkWasmWallet } from 'zkwasm-minirollup-browser';

import { createZkWasmWalletHook } from './reduxstate';

// Legacy hook for backward compatibility
// This requires wagmi providers to be set up in the consuming application
export const useZkWasmWalletLegacy = createZkWasmWalletHook({
  useAccount: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useChainId: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useSignMessage: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useSwitchChain: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useConnect: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useDisconnect: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
  useConnectModal: () => {
    throw new Error('Legacy useZkWasmWalletLegacy requires wagmi providers. Please use the new useZkWasmWallet hook instead.');
  },
});

// Re-export the new Provider-based hook
export { useZkWasmWallet } from './reduxstate'; 