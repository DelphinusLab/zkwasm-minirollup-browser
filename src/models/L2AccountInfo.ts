import BN from "bn.js";
import { PrivateKey, bnToHexLe } from "delphinus-curves/src/altjubjub";
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import { L2AccountData } from '../types';

export class L2AccountInfo {
  #prikey: string;
  pubkey: BN;

  constructor(address0x: string) {
    this.#prikey = address0x.substring(2);
    const pkey = PrivateKey.fromString(this.#prikey);
    this.pubkey = pkey.publicKey.key.x.v;
  }

  getPrivateKey() {
    return this.#prikey;
  }

  toHexStr(): string {
    return this.pubkey.toString("hex");
  }
 
  getPidArray(): [bigint, bigint] {
    const leHexBN = new LeHexBN(bnToHexLe(this.pubkey));
    const pkeyArray = leHexBN.toU64Array();
    return [pkeyArray[1], pkeyArray[2]];
  }

  toSerializableData(): L2AccountData {
    const [pid1, pid2] = this.getPidArray();
    return {
      privateKey: this.#prikey,
      publicKeyHex: this.toHexStr(),
      pid1: pid1.toString(),
      pid2: pid2.toString()
    };
  }

  static fromSerializableData(data: L2AccountData): L2AccountInfo {
    return new L2AccountInfo('0x' + data.privateKey);
  }
} 