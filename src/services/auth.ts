import { signMessage } from "../utils/address";
import { withProvider } from "../providers/provider";
import { validateAndSwitchNetwork } from "../utils";
import { L1AccountInfo } from '../types';
import { L2AccountInfo } from '../models/L2AccountInfo';

export async function loginL1Account(): Promise<L1AccountInfo> {
  return await withProvider(async (provider) => {
    // 验证并切换网络
    await validateAndSwitchNetwork(provider);
    
    // 获取账户信息
    const signer = await provider.getJsonRpcSigner();
    const networkId = await provider.getNetworkId();
    
    return {
        address: await signer.getAddress(),
        chainId: networkId.toString()
    };
  });
}

export async function loginL2Account(address: string): Promise<L2AccountInfo> {
  const str: string = await signMessage(address);
  console.log("signed result", str);
  return new L2AccountInfo(str.substring(0, 34));
} 