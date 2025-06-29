export const contractABI = {
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