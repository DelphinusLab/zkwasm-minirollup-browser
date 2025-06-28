import { Contract, Signer, Provider, InterfaceAbi } from "ethers";
import { DelphinusProvider, withProvider } from "./provider.js";

export class DelphinusContract {
  private readonly contract: Contract;
  private readonly jsonInterface: InterfaceAbi;
  /**
   *
   * @param jsonInterface
   * This is the json interface of the contract.
   * @param contractAddress
   * This is the address of the contract.
   * @param signerOrProvider
   * If signer is provided, the contract will be connected to the signer as
   * If provider is provided, the contract will be read only.
   */
  constructor(
    contractAddress: string,
    jsonInterface: InterfaceAbi,
    signerOrProvider?: Signer | Provider
  ) {
    this.jsonInterface = jsonInterface;

    this.contract = new Contract(
      contractAddress,
      jsonInterface,
      signerOrProvider
    );
  }

  getEthersContract() {
    return this.contract;
  }

  getJsonInterface() {
    return this.jsonInterface;
  }

  // Subscribe to events emitted by the contract
  subscribeEvent<T>(eventName: string, cb: (event: T) => unknown) {
    return this.contract.on(eventName, cb);
  }

  async getPastEventsFrom(fromBlock: number) {
    return await this.contract.queryFilter("*", fromBlock);
  }

  async getPastEventsFromTo(fromBlock: number, toBlock: number) {
    return await this.contract.queryFilter("*", fromBlock, toBlock);
  }

  async getPastEventsFromSteped(
    fromBlock: number,
    toBlock: number,
    step: number
  ) {
    let pastEvents = [];
    let start = fromBlock;
    let end = 0;
    if (fromBlock > toBlock) {
      console.log("No New Blocks Found From:" + fromBlock);
      return { events: [], breakpoint: null };
    }
    if (step <= 0) {
      pastEvents.push(await this.getPastEventsFromTo(start, toBlock));
      end = toBlock;
      console.log("getEvents from", start, "to", end);
    } else {
      let count = 0;
      while (end < toBlock && count < 10) {
        end = start + step - 1 < toBlock ? start + step - 1 : toBlock;
        console.log("getEvents from", start, "to", end);
        let group = await this.getPastEventsFromTo(start, end);
        if (group.length != 0) {
          pastEvents.push(group);
        }
        start += step;
        count++;
      }
    }
    return { events: pastEvents, breakpoint: end };
  }
}

// New generic withProvider function, replaces all old withXXX functions
export { withProvider } from "./provider.js";

// For backward compatibility, keep old function names but use new Provider pattern internally
export async function withBrowserConnector<T>(
  cb: (provider: DelphinusProvider) => Promise<T>
): Promise<T> {
  return await withProvider(cb);
}

export async function withReadOnlyConnector<T>(
  cb: (provider: DelphinusProvider) => Promise<T>,
  providerUrl: string
): Promise<T> {
  // Note: This function requires provider configuration to be set first
// In actual use, should call setProviderConfig({ type: 'readonly', providerUrl }) first
  return await withProvider(cb);
}

export async function withDelphinusWalletConnector<T>(
  cb: (provider: DelphinusProvider) => Promise<T>,
  providerUrl: string,
  privateKey: string
): Promise<T> {
  // Note: This function requires provider configuration to be set first
// In actual use, should call setProviderConfig({ type: 'wallet', providerUrl, privateKey }) first
  return await withProvider(cb);
}
