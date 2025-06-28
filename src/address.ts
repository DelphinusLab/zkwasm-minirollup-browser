import { withProvider } from "./provider.js";

export function addressAbbreviation(address: string, tailLength: number) {
  return address.substring(0,8) + "..." + address.substring(address.length - tailLength, address.length);
}

export function hexAbbreviation(address: string, tailLength: number) {
  return address.substring(0,3) + "..." + address.substring(address.length - tailLength, address.length);
}

export async function signMessage(message: string) {
  const signature = await withProvider(async (provider) => {
    if (!provider) {
      throw new Error("No provider found!");
    }
    const signature = await provider.sign(message);
    return signature;
  });
  return signature;
}

// RainbowKit 版本的消息签名函数
export async function signMessageWithRainbowKit(message: string, rainbowKitHooks: any) {
  // 直接使用 RainbowKit hooks 的签名功能
  const signature = await rainbowKitHooks.signMessageAsync({ message });
  return signature;
}

export async function switchNetwork(chainId: number) {
  await withProvider(async (provider) => {
    if (!provider) {
      throw new Error("No provider found!");
    }
    await provider.switchNet("0x" + chainId.toString(16));
  });
}

// RainbowKit 版本的网络切换函数
export async function switchNetworkWithRainbowKit(chainId: number, rainbowKitHooks: any) {
  // 使用 RainbowKit hooks 的网络切换功能
  await rainbowKitHooks.switchChain({ chainId });
}


