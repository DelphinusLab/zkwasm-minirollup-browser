import React from 'react'
import ReactDOM from 'react-dom/client'

// 使用 SDK 导出的统一 Provider
import { 
  DelphinusReactProvider
} from '../../src/index'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DelphinusReactProvider appName="Delphinus zkWasm MiniRollup Example">
      <App />
    </DelphinusReactProvider>
  </React.StrictMode>,
) 