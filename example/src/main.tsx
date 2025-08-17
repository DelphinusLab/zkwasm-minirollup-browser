import React from 'react'
import ReactDOM from 'react-dom/client'

// Use unified Provider exported from SDK
import { 
  DelphinusReactProvider
} from '../../src/index'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DelphinusReactProvider appName="zkWasm Staking Platform">
      <App />
    </DelphinusReactProvider>
  </React.StrictMode>,
) 