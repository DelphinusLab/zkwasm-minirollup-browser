import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useWalletContext,
  getEnvConfig,
  validateEnvConfig,
  setProviderConfig,
  withProvider,
  syncBrowserWalletState,
  type AccountState,
  type DelphinusProvider,
  // Import RainbowKit components from SDK
  ConnectButton,
  useConnectModal,
} from '../../src/index';
import './App.css';

// Define Redux store's root state type for advanced Redux access
interface RootState {
  account: AccountState;
}

function App() {
  // const dispatch = useDispatch<any>(); // No longer needed with unified wallet context
  
  // Get environment configuration
  const envConfig = React.useMemo(() => getEnvConfig(), []);
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  
  // RainbowKit hooks (exported from SDK)
  const { openConnectModal } = useConnectModal();
  
  // ✨ NEW: Use unified wallet context - everything in one hook!
  const {
    // Connection states
    isConnected,        // L1 connection status
    isL2Connected,      // L2 connection status  
    l1Account,          // L1 account info
    l2Account,          // L2 account info (full L2AccountInfo instance)
    playerId,           // [string, string] | null - PID array
    address,            // wallet address
    chainId,            // current chain ID
    
    // Actions
    connectL1,          // connect L1 wallet
    connectL2,          // connect L2 account
    disconnect,         // disconnect wallet
    deposit,            // deposit method
  } = useWalletContext();
  
  const [depositAmount, setDepositAmount] = useState('0.01');
  
  // Advanced Redux state access (optional, for status monitoring)
  const { status } = useSelector((state: RootState) => state.account);
  
  // Derived states (now much simpler)
  const isLoading = status.includes('Loading');
  const lastError = status.includes('Error') ? status : null;

  // Validate environment configuration
  useEffect(() => {
    const validation = validateEnvConfig();
    if (!validation.isValid) {
      setConfigErrors(validation.errors);
    } else {
      setConfigErrors([]);
      // Set Provider configuration
      setProviderConfig({ type: 'rainbow' });
    }
  }, [envConfig]);

  // Test Provider connection
  const testProviderConnection = async () => {
    try {
      const result = await withProvider(async (provider: DelphinusProvider) => {
        const networkId = await provider.getNetworkId();
        return {
          networkId: networkId.toString(),
          isConnected: true
        };
      });
      alert(`Provider test successful! Network ID: ${result.networkId}`);
      return result;
    } catch (error) {
      console.error('Provider test failed:', error);
      alert(`Provider test failed: ${error instanceof Error ? error.message : String(error)}`);
      return { isConnected: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  // Direct browser wallet connection (using window.ethereum)
  const handleBrowserWalletConnect = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert('MetaMask not detected! Please install MetaMask browser extension.');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        alert('No accounts found. Please unlock your wallet.');
        return;
      }

      // Get current chain ID
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      console.log('Browser wallet connected:', {
        account: accounts[0],
        chainId: parseInt(chainId, 16)
      });

      // 🔄 Sync browser wallet state with wagmi
      console.log('Before sync - isConnected:', isConnected, 'address:', address);
      
      const syncResult = await syncBrowserWalletState();
      
      // Give a bit more time for wagmi to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('After sync - isConnected:', isConnected, 'address:', address);
      
      if (syncResult.success) {
        console.log('✅ Wallet state synced with SDK');
        alert(`Wallet connected and synced!\nAddress: ${accounts[0]}\nChain ID: ${parseInt(chainId, 16)}\n\nSDK Status:\n- isConnected: ${isConnected}\n- SDK Address: ${address || 'updating...'}`);
      } else {
        console.warn('⚠️ Failed to sync wallet state with SDK');
        alert(`Wallet connected but sync failed.\nAddress: ${accounts[0]}\nChain ID: ${parseInt(chainId, 16)}\n\nTry refreshing the page or using RainbowKit buttons.`);
      }
      
    } catch (error) {
      console.error('Browser wallet connection failed:', error);
      alert(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // L1 account connection - now simplified!
  const handleL1Connect = async () => {
    // For browser provider, ensure wallet is connected first
    if (!isConnected) {
      alert('Please connect your wallet first using the Connect button above!');
      return;
    }
    
    try {
      await connectL1();
    } catch (error) {
      console.error('L1 connect failed:', error);
      alert(`L1 connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // L2 account connection - now simplified!
  const handleL2Connect = async () => {
    try {
      await connectL2();
    } catch (error) {
      console.error('L2 connect failed:', error);
      alert(`L2 connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Deposit to L2 (using unified wallet context)
  const handleDeposit = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!isL2Connected) {
      alert('Please connect L2 account first');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    
    try {
      // Use the unified deposit method from wallet context
      await deposit({
        tokenIndex: 0,
        amount: Number(depositAmount)
      });
      
      alert('Deposit successful!');
    } catch (error) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Wallet disconnect - now simplified!
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  // Direct Provider signing test
  const handleTestSign = async () => {
    try {
      const signature = await withProvider(async (provider: DelphinusProvider) => {
        return await provider.sign('Hello from unified wallet context!');
      });
      alert(`Signature: ${signature.substring(0, 20)}...`);
    } catch (error) {
      console.error('Sign test failed:', error);
      alert(`Sign failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // If there are configuration errors, show error messages
  if (configErrors.length > 0) {
    return (
      <div className="App">
        <div className="container">
          <h1>Configuration Error</h1>
          <div className="error-section">
            <h2>Missing Environment Variables:</h2>
            <ul>
              {configErrors.map((error, index) => (
                <li key={index} className="error-message">{error}</li>
              ))}
            </ul>
            <div className="config-help">
              <h3>How to fix:</h3>
              <p>Create a <code>.env</code> file in the example directory with the following variables:</p>
              <pre>
{`REACT_APP_CHAIN_ID=11155111
REACT_APP_DEPOSIT_CONTRACT=0x1234567890123456789012345678901234567890
REACT_APP_TOKEN_CONTRACT=0x0987654321098765432109876543210987654321
REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id`}
              </pre>
              <p>You can copy from <code>env.example</code> and modify the values.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <h1>zkWasm Mini Rollup - Unified Wallet Context</h1>
        
        {/* Unified Context Info */}
        <div className="provider-info">
          <h2>🎯 Unified Wallet Context Pattern</h2>
          <p>This example now uses the unified wallet context with:</p>
          <ul>
            <li>✅ Single <code>useWalletContext</code> hook for everything</li>
            <li>✅ Automatic state management and synchronization</li>
            <li>✅ Built-in PID (Player ID) calculation</li>
            <li>✅ Type-safe interface with full L2 account access</li>
            <li>✅ Simplified error handling and status management</li>
          </ul>
        </div>

        {/* RainbowKit Components Demo */}
        <div className="rainbowkit-demo">
          <h2>🌈 Wallet Connection Options</h2>
          <p>Choose your preferred connection method:</p>
          
          <div className="demo-section">
            <h3>🔧 Browser Provider (window.ethereum)</h3>
            <button 
              onClick={handleBrowserWalletConnect}
              className="browser-connect-btn"
              style={{
                padding: '10px 20px',
                backgroundColor: '#ff6b35',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Connect MetaMask (Browser)
            </button>
            <p><small>Direct connection using window.ethereum API (recommended for browser provider)</small></p>
          </div>

          <div className="demo-section">
            <h3>🌈 RainbowKit Components (Alternative)</h3>
            <p>These components are directly exported from our SDK:</p>
            
            <div style={{ marginBottom: '10px' }}>
              <ConnectButton />
              <p><small>RainbowKit's official ConnectButton component</small></p>
            </div>

            <div>
              <button 
                onClick={openConnectModal} 
                disabled={!openConnectModal}
                className="rainbow-btn"
              >
                Open Connect Modal
              </button>
              <p><small>Programmatically open RainbowKit's connect modal</small></p>
            </div>
          </div>

          <div className="demo-section">
            <h3>useWalletContext Hook (Recommended)</h3>
            <div className="account-status">
              <p><strong>L1 Connected:</strong> {isConnected ? '✅' : '❌'}</p>
              <p><strong>L2 Connected:</strong> {isL2Connected ? '✅' : '❌'}</p>
              <p><strong>Address:</strong> {address || 'Not connected'}</p>
              <p><strong>Chain ID:</strong> {chainId || 'Unknown'}</p>
              <p><strong>Player ID:</strong> {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'None'}</p>
            </div>
            <p><small>Unified wallet state via zkWasm SDK (one hook for everything!)</small></p>
          </div>
        </div>
        
        {/* Wallet Connection Actions */}
        {isConnected && (
          <div className="wallet-section">
            <div className="wallet-info">
              <h3>Wallet Connected</h3>
              <p>Address: {address}</p>
              <p>Chain ID: {chainId}</p>
            </div>
            <div className="wallet-actions">
              <button 
                onClick={handleDisconnect}
                className="disconnect-btn"
              >
                Disconnect
              </button>
              <button 
                onClick={handleTestSign}
                className="test-btn"
              >
                Test Sign
              </button>
              <button 
                onClick={testProviderConnection}
                className="test-btn"
              >
                Test Provider
              </button>
            </div>
          </div>
        )}

        {/* L1 Account Section */}
        <div className="account-section">
          <h2>L1 Account (Target Network)</h2>
          
          {!isConnected ? (
            <div>
              <p className="warning">⚠️ Wallet not connected! Please connect your wallet first.</p>
              <p>For <code>browser</code> provider: Use the "Connect MetaMask (Browser)" button above (recommended)</p>
              <p>Or try the RainbowKit buttons as an alternative.</p>
              <button 
                onClick={handleL1Connect} 
                disabled={true}
                className="login-button disabled"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                Connect Wallet First
              </button>
              <p><small>This button will be enabled after wallet connection</small></p>
            </div>
          ) : !l1Account ? (
            <div>
              <p>✅ Wallet connected! Now login to L1 account.</p>
              <button 
                onClick={handleL1Connect} 
                disabled={isLoading}
                className="login-button"
              >
                {isLoading ? 'Connecting...' : 'Login L1 Account'}
              </button>
            </div>
          ) : (
            <div className="account-info">
              <p className="success">✅ L1 Account Connected</p>
              <p><strong>L1 Address:</strong> {l1Account.address}</p>
              <p><strong>Chain ID:</strong> {l1Account.chainId}</p>
              <div className="account-actions">
                <p>L1 account can perform the following operations:</p>
                <ul>
                  <li>View target network token balance</li>
                  <li>Deposit tokens to L2 deposit contract</li>
                  <li>Interact with target network contracts</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* L2 Account Section */}
        <div className="account-section">
          <h2>L2 Account (zkWasm Rollup)</h2>
          
          {!isL2Connected ? (
            <div>
              <p>Generate L2 key pair by signing fixed message "WalletContext"</p>
              <p><small>L2 private key will be securely generated from your signature</small></p>
              <button 
                onClick={handleL2Connect} 
                disabled={!isConnected || isLoading}
                className="login-button"
              >
                {isLoading ? 'Generating L2 Keys...' : 'Generate L2 Account'}
              </button>
            </div>
          ) : (
            <div className="account-info">
              <p className="success">✅ L2 Account Generated</p>
              <p><strong>L2 Public Key:</strong> {l2Account?.toHexStr()}</p>
              <p><strong>Player ID:</strong> {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'Calculating...'}</p>
              {l2Account && (
                <>
                  <p><strong>L2 PID[1]:</strong> {l2Account.getPidArray()[0].toString()}</p>
                  <p><strong>L2 PID[2]:</strong> {l2Account.getPidArray()[1].toString()}</p>
                </>
              )}
              <p><small>L2 account automatically provides PID array via unified context</small></p>
              <div className="account-actions">
                <p>L2 account can perform the following operations:</p>
                <ul>
                  <li>View L2 Rollup balance</li>
                  <li>Perform fast transactions on L2</li>
                  <li>Interact with L2 contracts</li>
                  <li>Withdraw funds to L1</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Deposit Section */}
        <div className="deposit-section">
          <h2>Deposit from L1 to L2 Contract</h2>
          
          {!isConnected || !isL2Connected ? (
            <p className="warning">⚠️ Please connect both L1 and L2 accounts to make deposits</p>
          ) : (
            <div className="deposit-form">
              <div className="input-group">
                <label>Deposit Amount (Token Quantity):</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="amount-input"
                />
              </div>
              
              <button 
                onClick={handleDeposit}
                disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                className="deposit-button"
              >
                {isLoading ? 'Depositing...' : `Deposit ${depositAmount} Tokens to L2`}
              </button>
              
              <div className="deposit-info">
                <p><strong>From L1 Address:</strong> {l1Account?.address}</p>
                <p><strong>To Deposit Contract:</strong> {envConfig.depositContract || 'Configuring...'}</p>
                <p><strong>Using Token Contract:</strong> {envConfig.tokenContract || 'Configuring...'}</p>
                <p><strong>L2 Recipient:</strong> {l2Account?.toHexStr()}</p>
                <p><strong>Player ID:</strong> {playerId ? `[${playerId[0]}, ${playerId[1]}]` : 'Calculating...'}</p>
                <p><small>Deposit will send tokens from your L1 address to the deposit contract and record to L2 account</small></p>
              </div>
            </div>
          )}
        </div>

        {/* Status Display */}
        <div className="status-section">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className={`status-item ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-label">Wallet Connection:</span>
              <span className="status-value">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className={`status-item ${l1Account ? 'connected' : 'disconnected'}`}>
              <span className="status-label">L1 Account:</span>
              <span className="status-value">{l1Account ? 'Logged In' : 'Not Logged In'}</span>
            </div>
            <div className={`status-item ${isL2Connected ? 'connected' : 'disconnected'}`}>
              <span className="status-label">L2 Account:</span>
              <span className="status-value">{isL2Connected ? 'Logged In' : 'Not Logged In'}</span>
            </div>
          </div>
          
          <div className="unified-context-status">
            <h3>Unified Context Status</h3>
            <p>✅ All wallet state managed by single <code>useWalletContext</code> hook</p>
            <p>✅ Automatic state synchronization and PID calculation</p>
            <p>✅ Simplified error handling and loading states</p>
            <p>Status: {status}</p>
          </div>
          
          {lastError && (
            <div className="error-message">
              <p><strong>Error:</strong> {lastError}</p>
            </div>
          )}
        </div>

        {/* Configuration Information */}
        <div className="config-section">
          <h2>Configuration Information</h2>
          <div className="config-info">
            <p><strong>Target Chain ID:</strong> {envConfig.chainId}</p>
            <p><strong>Current Environment:</strong> {envConfig.mode}</p>
            <p><strong>WalletConnect Project ID:</strong> {
              envConfig.walletConnectId ? 'Configured' : 'Not Configured'
            }</p>
            <p><strong>Deposit Contract Address:</strong> {
              envConfig.depositContract ? envConfig.depositContract : 'Not Configured'
            }</p>
            <p><strong>Token Contract Address:</strong> {
              envConfig.tokenContract ? envConfig.tokenContract : 'Not Configured'
            }</p>
          </div>
          
          <div className="provider-status">
            <h3>Unified Context Pattern Status</h3>
            <p>✅ Using unified wallet context design pattern</p>
            <p>✅ Environment variables loaded via dotenv adapter</p>
            <p>✅ Type-safe wallet interface</p>
            <p>✅ Automatic provider configuration</p>
            <p>✅ Built-in PID management and L2 account methods</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 