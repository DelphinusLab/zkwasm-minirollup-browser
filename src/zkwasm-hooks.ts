// This file provides ready-to-use React Hooks that external projects can directly import and use

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { createZkWasmWalletHook } from './reduxstate';

// Pre-configured zkWasm SDK Hook - external projects can use directly
export const useZkWasmWallet = createZkWasmWalletHook({
  useAccount,
  useChainId,
  useSignMessage,
  useSwitchChain,
  useConnect,
  useDisconnect,
  useConnectModal,
}); 