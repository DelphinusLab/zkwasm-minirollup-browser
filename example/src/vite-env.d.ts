/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_WALLETCONNECT_PROJECT_ID?: string
  readonly REACT_APP_CHAIN_ID?: string
  readonly REACT_APP_DEPOSIT_CONTRACT?: string
  readonly REACT_APP_TOKEN_CONTRACT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 