// 🚀 zkWasm 钱包 Hooks - 新的拆分设计
// 使用拆分的hooks以获得更好的性能和代码组织

/**
 * 连接状态管理 Hook
 * 只处理钱包连接状态相关的逻辑
 * 当只需要连接状态时使用，避免不必要的重新渲染
 */
export { useConnection } from './useConnection';

/**
 * 钱包操作 Hook 
 * 处理所有钱包相关的操作（登录、存款等）
 * 当需要执行钱包操作时使用
 */
export { useWalletActions, type DepositParams } from './useWalletActions';

// 使用示例：
// 
// 1. 只需要连接状态的组件：
// const { isConnected, address, chainId } = useConnection();
//
// 2. 需要执行操作的组件：
// const { connectAndLoginL1, loginL2, deposit, reset } = useWalletActions(address, chainId);
//
// 3. 同时需要状态和操作的组件：
// const { isConnected, address, chainId } = useConnection();
// const { connectAndLoginL1, loginL2 } = useWalletActions(address, chainId); 