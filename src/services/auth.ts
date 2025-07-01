import { signMessage } from "../utils/address";
import { withProvider } from "../providers/provider";
import { validateAndSwitchNetwork } from "../utils";
import { L1AccountInfo } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

export async function loginL1Account(): Promise<L1AccountInfo> {
  return await withProvider(async (provider) => {
    // Validate and switch network
    await validateAndSwitchNetwork(provider);
    
    // Get account information
    const signer = await provider.getJsonRpcSigner();
    const networkId = await provider.getNetworkId();
    
    return {
        address: await signer.getAddress(),
        chainId: networkId.toString()
    };
  });
}

/**
 * L2 Account Login - Generate L2 account by signing specified message
 * @param messageToSign Message content to sign, usually application name
 * @returns L2AccountInfo instance
 */
export async function loginL2Account(messageToSign: string): Promise<L2AccountInfo> {
  const str: string = await signMessage(messageToSign);
  return new L2AccountInfo(str.substring(0, 34));
} 