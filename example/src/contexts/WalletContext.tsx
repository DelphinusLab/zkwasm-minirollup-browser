// 🚀 使用 zkWasm SDK 提供的统一钱包上下文
// 直接使用SDK的完整功能，无需自定义实现

import { useWalletContext, type WalletContextType } from 'zkwasm-minirollup-browser';
    
// Re-export SDK的hook，保持项目中的命名约定
export const useWallet = useWalletContext;

// 导出类型定义
export type { WalletContextType };
          
// 注意：不再需要 WalletProvider，因为 DelphinusReactProvider 已经提供了所有必要的context 