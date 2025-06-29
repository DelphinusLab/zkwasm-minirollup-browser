import { withProvider } from "../providers/provider";

export function addressAbbreviation(address: string, tailLength: number): string {
  return address.substring(0, 8) + "..." + address.substring(address.length - tailLength, address.length);
}

export function hexAbbreviation(address: string, tailLength: number): string {
  return address.substring(0, 3) + "..." + address.substring(address.length - tailLength, address.length);
}

export async function signMessage(message: string): Promise<string> {
  const signature = await withProvider(async (provider) => {
    if (!provider) {
      throw new Error("No provider found!");
    }
    const signature = await provider.sign(message);
    return signature;
  });
  return signature;
}

export async function switchNetwork(chainId: number): Promise<void> {
  await withProvider(async (provider) => {
    if (!provider) {
      throw new Error("No provider found!");
    }
    await provider.switchNet("0x" + chainId.toString(16));
  });
} 