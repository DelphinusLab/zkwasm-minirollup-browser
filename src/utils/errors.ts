import { ApiError } from '../types';

export class ZkWasmError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ZkWasmError';
  }
}

export function createError(message: string, code?: string, originalError?: any): ZkWasmError {
  return new ZkWasmError(message, code, originalError);
}

export function handleApiError(error: ApiError): ZkWasmError {
  if (error.response) {
    const status = error.response.status;
    if (status === 500) {
      return createError('Server error occurred', 'SERVER_ERROR', error);
    } else {
      return createError(`API error: ${status}`, 'API_ERROR', error);
    }
  } else if (error.request) {
    return createError(
      'No response received from server. Please check your network connection.',
      'NETWORK_ERROR',
      error
    );
  } else {
    return createError('Unknown error occurred', 'UNKNOWN_ERROR', error);
  }
}

export function handleRpcError(error: any, operation: string): ZkWasmError {
  console.error(`${operation} failed:`, error);
  
  if (error instanceof ZkWasmError) {
    return error;
  }
  
  return createError(
    `${operation} failed: ${error.message || 'Unknown error'}`,
    'RPC_ERROR',
    error
  );
}

export function handleProviderError(error: any, operation: string): ZkWasmError {
  console.error(`Provider ${operation} failed:`, error);
  
  if (error instanceof ZkWasmError) {
    return error;
  }
  
  return createError(
    `Provider ${operation} failed: ${error.message || 'Unknown error'}`,
    'PROVIDER_ERROR',
    error
  );
} 