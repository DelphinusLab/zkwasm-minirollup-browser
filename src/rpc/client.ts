import { ZKWasmAppRpc } from 'zkwasm-minirollup-rpc';
import { getRpcUrl as getEnvRpcUrl } from '../config/env-adapter';

// Get the current URL components
const currentLocation = window.location;
const protocol = currentLocation.protocol; // e.g., 'http:' or 'https:'
const hostname = currentLocation.hostname; // e.g., 'sinka' or 'localhost'

// We assume the rpc is at port 3000
let rpcUrl = `${protocol}//${hostname}` + ":3000";
let rpcInstance: ZKWasmAppRpc | null = null;

// Function to get the RPC URL
export function getRpcUrl(): string {
  return rpcUrl;
}

// Function to set the RPC URL
export function setRpcUrl(): void {
  // Use unified environment variable handling
  const envRpcUrl = getEnvRpcUrl();
  rpcUrl = envRpcUrl || `${protocol}//${hostname}` + ":3000";
  rpcInstance = new ZKWasmAppRpc(rpcUrl);
}

// Function to get the RPC instance
export function getRpc(): ZKWasmAppRpc {
  if (!rpcInstance) {
    rpcInstance = new ZKWasmAppRpc(rpcUrl);
  }
  return rpcInstance;
}

// Initialize the RPC instance
getRpc();

// RPC service functions
export async function queryConfig() {
  try {
    const state = await getRpc().queryConfig();
    return state;
  } catch (error) {
    throw "QueryStateError " + error;
  }
}

export async function queryState(prikey: string) {
  try {
    const data: any = await getRpc().queryState(prikey);
    return JSON.parse(data.data);
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 500) {
        throw "QueryStateError";
      } else {
        throw "UnknownError";
      }
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      throw "No response was received from the server, please check your network connection.";
    } else {
      throw "UnknownError";
    }
  }
}

export const SERVER_TICK_TO_SECOND = 5; 