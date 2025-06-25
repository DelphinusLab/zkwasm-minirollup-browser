import '@rainbow-me/rainbowkit/styles.css';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetAccountState,
  useZkWasmWallet,
  type AccountState
} from '../../src/index';
import './App.css';

// Define Redux store's root state type
interface RootState {
  account: AccountState;
}

// Safely get environment variables - moved outside component to avoid repeated calls
const getEnvConfig = () => {
  try {
    const chainId = (import.meta.env?.REACT_APP_CHAIN_ID as string) || '';
    
    return {
      walletConnectId: (import.meta.env?.REACT_APP_WALLETCONNECT_PROJECT_ID as string) || '',
      mode: (import.meta.env?.MODE as string) || 'development',
      depositContract: (import.meta.env?.REACT_APP_DEPOSIT_CONTRACT as string) || '',
      tokenContract: (import.meta.env?.REACT_APP_TOKEN_CONTRACT as string) || '',
      chainId
    };
  } catch {
    return {
      walletConnectId: '',
      mode: 'development',
      depositContract: '',
      tokenContract: '',
      chainId: ''
    };
  }
};

// Cache environment configuration
const envConfig = getEnvConfig();

function App() {
  const dispatch = useDispatch();
  
  // Use zkWasm SDK Hook to replace all wagmi hooks
  const wallet = useZkWasmWallet();
  const { 
    isConnected, 
    address, 
    chainId, 
    connectAndLoginL1, 
    loginL2, 
    deposit: walletDeposit, 
    disconnect,
    reset 
  } = wallet;
  
  const [depositAmount, setDepositAmount] = useState('0.01');
  
  // Redux state
  const accountState = useSelector((state: RootState) => state.account);
  const { 
    l1Account, 
    l2account,
    status 
  } = accountState;

  // Calculate states
  const isL1Connected = !!l1Account;
  const isL2Connected = !!l2account;
  const isL1Connecting = status === 'LoadingL1';
  const isL2Connecting = status === 'LoadingL2';
  const isDepositing = status === 'Deposit';
  const lastError = status.includes('Error') ? status : null;

  // L1 account login
  const handleL1Login = useCallback(async () => {
    try {
      console.log('Starting wallet connection and L1 login...');
      const result = await connectAndLoginL1(dispatch);
      console.log('Connect and L1 login result:', result);
    } catch (error) {
      console.error('Connect and L1 login failed:', error);
    }
  }, [connectAndLoginL1, dispatch]);

  // Monitor wallet connection status changes, reset state when disconnected
  useEffect(() => {
    if (!isConnected) {
      console.log('Wallet disconnected, resetting account state');
      dispatch(resetAccountState());
    }
  }, [isConnected, dispatch]);

  // Auto L1 login when wallet is connected - optimized conditions and dependencies
  useEffect(() => {
    console.log('useEffect triggered with:', { 
      isConnected, 
      hasAddress: !!address,
      hasL1Account: !!l1Account, 
      status
    });
    
    // Only attempt login when wallet is connected, has address, no L1 account, and status is Ready
    if (isConnected && address && !l1Account && status === 'Ready') {
      console.log('Wallet connected, attempting L1 login...', { address, chainId });
      handleL1Login();
    }
  }, [isConnected, address, l1Account, status, handleL1Login]);  // Remove chainId dependency to avoid repeated triggers

  // L2 account login
  const handleL2Login = async () => {
    try {
      console.log('Logging in L2 account...');
      await loginL2(dispatch, "0xAUTOMATA");
      console.log('L2 login successful');
    } catch (error) {
      console.error('L2 login failed:', error);
    }
  };

  // Deposit to L2
  const handleDeposit = async () => {
    if (!isL1Connected) {
      alert('Please login to L1 account first');
      return;
    }

    if (!isL2Connected) {
      alert('Please login to L2 account first');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }
    
    try {
      console.log('Starting deposit...', {
        tokenIndex: 0,
        amount: Number(depositAmount),
        l1account: l1Account,
        l2account: l2account.toSerializableData(),
        chainId
      });

      await walletDeposit(dispatch, {
        tokenIndex: 0,
        amount: Number(depositAmount),
        l2account: l2account!,
        l1account: l1Account!
      });
      
      console.log('Deposit successful');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  // Wallet disconnect
  const handleWalletDisconnect = () => {
    reset(dispatch);
  };

  // Render wallet connection buttons
  const renderWalletConnectButtons = () => {
    if (isConnected) {
      return (
        <div className="wallet-section">
          <div className="wallet-info">
            <h3>Wallet Connected</h3>
            <p>Address: {address}</p>
            <p>Chain ID: {chainId}</p>
          </div>
          <button 
            onClick={handleWalletDisconnect}
            className="disconnect-btn"
          >
            Disconnect
          </button>
        </div>
      );
    }

    // If wallet is not connected, don't show any buttons
    // L1 login button will automatically handle wallet connection
    return null;
  };

  return (
    <div className="App">
      <div className="container">
        <h1>zkWasm Mini Rollup - RainbowKit Integration</h1>
        
        {/* Wallet Connection */}
        {renderWalletConnectButtons()}

        {/* L1 Account Section */}
        <div className="account-section">
          <h2>L1 Account (Target Network)</h2>
          
          {!isL1Connected ? (
            <div>
              <p>Please login to L1 account to use target network functionality</p>
              <button 
                onClick={handleL1Login} 
                disabled={isL1Connecting}
                className="login-button"
              >
                {isL1Connecting ? 'Connecting...' : 'Connect L1 Account'}
              </button>
              <p><small>If wallet is not connected, clicking the button will automatically open the connection modal</small></p>
              {status === 'L1AccountError' && (
                <p className="error-message">
                  <small>⚠️ Login failed, please check wallet connection or network settings and try again</small>
                </p>
              )}
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
              <p>Generate L2 key pair by signing fixed message "0xAUTOMATA"</p>
              <p><small>L2 private key will be securely generated from your signature of the fixed message</small></p>
              <button 
                onClick={handleL2Login} 
                disabled={!isConnected || isL2Connecting}
                className="login-button"
              >
                {isL2Connecting ? 'Generating L2 Keys...' : 'Generate L2 Account'}
              </button>
            </div>
          ) : (
            <div className="account-info">
              <p className="success">✅ L2 Account Generated</p>
              <p><strong>L2 Public Key:</strong> {l2account.toHexStr()}</p>
              <p><strong>L2 PID[1]:</strong> {l2account.getPidArray()[0].toString()}</p>
              <p><strong>L2 PID[2]:</strong> {l2account.getPidArray()[1].toString()}</p>
              <p><small>This key pair was generated by signing the fixed message "0xAUTOMATA"</small></p>
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
          
          {!isL1Connected || !isL2Connected ? (
            <p className="warning">⚠️ Please login to both L1 and L2 accounts to make deposits</p>
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
                disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                className="deposit-button"
              >
                {isDepositing ? 'Depositing...' : `Deposit ${depositAmount} Tokens to L2`}
              </button>
              
              <div className="deposit-info">
                <p><strong>From L1 Address:</strong> {l1Account.address}</p>
                <p><strong>To Deposit Contract:</strong> {envConfig.depositContract || 'Configuring...'}</p>
                <p><strong>Using Token Contract:</strong> {envConfig.tokenContract || 'Configuring...'}</p>
                <p><strong>L2 Recipient:</strong> {l2account.toHexStr()}</p>
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
            <div className={`status-item ${isL1Connected ? 'connected' : 'disconnected'}`}>
              <span className="status-label">L1 Account:</span>
              <span className="status-value">{isL1Connected ? 'Logged In' : 'Not Logged In'}</span>
            </div>
            <div className={`status-item ${isL2Connected ? 'connected' : 'disconnected'}`}>
              <span className="status-label">L2 Account:</span>
              <span className="status-value">{isL2Connected ? 'Logged In' : 'Not Logged In'}</span>
            </div>
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
            <p><strong>Target Chain ID:</strong> {chainId}</p>
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
        </div>
      </div>
    </div>
  );
}

export default App; 