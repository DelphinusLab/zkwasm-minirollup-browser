import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { withBrowserConnector } from "./client.js";
import { DelphinusBrowserConnector} from './provider.js';
import { PrivateKey, bnToHexLe } from "delphinus-curves/src/altjubjub";
import { signMessage } from "./address.js";
import { LeHexBN } from 'zkwasm-minirollup-rpc';
import BN from "bn.js";

export interface L1AccountInfo {
  address: string;
  chainId: string;
}

export class L2AccountInfo {
  address: string;
  constructor(address0x: string) {
    this.address = address0x.substring(2);
  }
  toBigInt(): bigint {
    return BigInt("0x" + this.address);
  }
}

async function loginL1Account() {
  return await withBrowserConnector(async (web3: DelphinusBrowserConnector) => {
    const chainidhex = "0x" + parseInt(process.env.REACT_APP_CHAIN_ID!).toString(16);
    await web3.switchNet(chainidhex);
    const i = await web3.getJsonRpcSigner();
    return {
        address: await i.getAddress(),
        chainId: (await web3.getNetworkId()).toString()
    }
  });
}

async function loginL2Account(address: string): Promise<L2AccountInfo> {
  const str:string = await signMessage(address);
  console.log("signed result", str);
  return new L2AccountInfo(str.substring(0,34));
}

const contractABI = {
  tokenABI: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  ],
  proxyABI: [
    {
      "inputs": [
        {
          "internalType": "uint128",
          "name": "tidx",
          "type": "uint128"
        },
        {
          "internalType": "uint64",
          "name": "pid_1",
          "type": "uint64"
        },
        {
          "internalType": "uint64",
          "name": "pid_2",
          "type": "uint64"
        },
        {
          "internalType": "uint128",
          "name": "amount",
          "type": "uint128"
        }
      ],
      "name": "topup",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
};

async function deposit(chainId: number, tokenIndex: number, amount: number, prikey: L2AccountInfo, l1account: L1AccountInfo) {
  try {
    await withBrowserConnector(async (connector: DelphinusBrowserConnector) => {
      const chainidhex = "0x" + parseInt(process.env.REACT_APP_CHAIN_ID!).toString(16);
      await connector.switchNet(chainidhex);
      const pkey = PrivateKey.fromString(prikey.address);
      const pubkey = pkey.publicKey.key.x.v;
      const leHexBN = new LeHexBN(bnToHexLe(pubkey));
      const pkeyArray = leHexBN.toU64Array();
      const proxyAddr = process.env.REACT_APP_DEPOSIT_CONTRACT!;
      const tokenAddr = process.env.REACT_APP_TOKEN_CONTRACT!;
      const tokenContract = await connector.getContractWithSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      const tokenContractReader = connector.getContractWithoutSigner(tokenAddr, JSON.stringify(contractABI.tokenABI));
      const balance = await tokenContractReader.getEthersContract().balanceOf(l1account.address);
      const allowance = await tokenContractReader.getEthersContract().allowance(l1account.address, proxyAddr);
      console.log("balance is:", balance);
      console.log("allowance is:", allowance);
      let a = new BN(amount);
      let b = new BN("10").pow(new BN(18));
      const amountWei = a.mul(b);
      if (allowance < amountWei) {
        if (balance >= amountWei) {
          const tx = await tokenContract.getEthersContract().approve(proxyAddr, balance);
          await tx.wait();
        } else {
          throw Error("Not enough balance for approve");
        }
      }
      const proxyContract = await connector.getContractWithSigner(proxyAddr, JSON.stringify(contractABI.proxyABI));
      const tx = await proxyContract.getEthersContract().topup.send(
        Number(tokenIndex),
        pkeyArray[1],
        pkeyArray[2],
        BigInt(amountWei.toString()),
      );
      const txReceipt = await tx.wait();
      // wait for tx to be mined, can add no. of confirmations as arg
      return txReceipt
      // tx.hash
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export interface AccountState {
  l1Account?: L1AccountInfo;
  l2account?: L2AccountInfo;
  status: 'LoadingL1' | 'LoadingL2' | 'L1AccountError' | 'L2AccountError' | 'Deposit' | 'Ready';
}

export interface State {
  account: AccountState;
}

const initialState: AccountState = {
  status: 'LoadingL1',
};

// The function below is called a thunk and allows us to perform async logic. It
// can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
// will call the thunk with the `dispatch` function as the first argument. Async
// code can then be executed and other actions can be dispatched. Thunks are
// typically used to make async requests.
export const loginL1AccountAsync = createAsyncThunk(
  'acccount/fetchAccount',
  async (thunkApi) => {
    const account = await loginL1Account();
    return account;
  }
);

export const loginL2AccountAsync = createAsyncThunk(
  'acccount/deriveL2Account',
  async (appName:string,  thunkApi) => {
    const l2account = await loginL2Account(appName);
    return l2account;
  }
);

export const depositAsync = createAsyncThunk(
  'acccount/deposit',
  async (params: {tokenIndex: number, amount: number, l2account: L2AccountInfo, l1account: L1AccountInfo} ,  thunkApi) => {
    return await deposit(parseInt(process.env.REACT_APP_CHAIN_ID!), params.tokenIndex, params.amount, params.l2account, params.l1account);
  }
);


export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setL1Account: (state, account) => {
      state.l1Account!.address = account.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginL1AccountAsync.pending, (state) => {
        state.status = 'LoadingL1';
      })
      .addCase(loginL1AccountAsync.fulfilled, (state, c) => {
        state.status = 'LoadingL2';
        state.l1Account = c.payload;
      })
      .addCase(loginL1AccountAsync.rejected, (state, c) => {
        state.status = 'L1AccountError';
      })
      .addCase(loginL2AccountAsync.pending, (state) => {
        state.status = 'LoadingL2';
      })
      .addCase(loginL2AccountAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c);
        state.l2account = c.payload;
      })
      .addCase(depositAsync.pending, (state) => {
        state.status = 'Deposit';
        console.log("deposit async is pending ....");
      })
      .addCase(depositAsync.fulfilled, (state, c) => {
        state.status = 'Ready';
        console.log(c.payload);
      })

  },
});

export const selectL1Account = <T extends State>(state: T) => state.account.l1Account;
export const selectL2Account = <T extends State>(state: T) => state.account.l2account;
export const selectLoginStatus = <T extends State>(state: T) => state.account.status;

export default accountSlice.reducer;
