import '@rainbow-me/rainbowkit/styles.css';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetAccountState,
  useZkWasmWallet,
  getEnvConfig,
  validateEnvConfig,
  setProviderConfig,
  withProvider,
  type AccountState,
  type DelphinusProvider,
  // 从 SDK 导入 RainbowKit 组件
  ConnectButton,
  useConnectModal,
  useAccount,
} from '../../src/index';
import './App.css';

// Define Redux store's root state type
interface RootState {
  account: AccountState;
}

function App() {
  const dispatch = useDispatch();
  
  // 获取环境配置（使用 useMemo 缓存）
  const envConfig = React.useMemo(() => getEnvConfig(), []);
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  
  // RainbowKit hooks（从 SDK 导出）
  const { openConnectModal } = useConnectModal();
  const rainbowAccount = useAccount();
  
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

  // 验证环境配置
  useEffect(() => {
    console.log('Environment config:', envConfig);
    console.log('Chain ID from env:', envConfig.chainId);
    console.log('WalletConnect ID from env:', envConfig.walletConnectId);
    
    const validation = validateEnvConfig();
    if (!validation.isValid) {
      setConfigErrors(validation.errors);
    } else {
      setConfigErrors([]);
      // 设置 Provider 配置
      setProviderConfig({ type: 'rainbow' });
    }
  }, [envConfig]);

  // 测试 Provider 连接
  const testProviderConnection = async () => {
    try {
      const result = await withProvider(async (provider: DelphinusProvider) => {
        const networkId = await provider.getNetworkId();
        return {
          networkId: networkId.toString(),
          isConnected: true
        };
      });
      console.log('Provider test result:', result);
      return result;
    } catch (error) {
      console.error('Provider test failed:', error);
      return { isConnected: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

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
    // Also check that we're not in an error state or loading state
    if (isConnected && address && !l1Account && status === 'Ready') {
      console.log('Wallet connected, attempting L1 login...', { address, chainId });
      handleL1Login();
    }
  }, [isConnected, address, l1Account, status, handleL1Login]);

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
  const handleWalletDisconnect = async () => {
    try {
      await reset(dispatch);
      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  // 直接使用 Provider 进行签名测试
  const handleTestSign = async () => {
    try {
      // 确保 RainbowKit provider 已初始化（如果使用的是 rainbow 类型）
      const { getProvider, DelphinusRainbowConnector } = await import('../../src/provider');
      const currentProvider = await getProvider();
      
      if (currentProvider instanceof DelphinusRainbowConnector && address && chainId) {
        try {
          await currentProvider.connect();
        } catch (error) {
          console.log('Initializing RainbowKit provider for sign test');
          await currentProvider.initialize(address as `0x${string}`, chainId);
        }
      }
      
      const signature = await withProvider(async (provider: DelphinusProvider) => {
        return await provider.sign('Hello from new Provider pattern!');
      });
      alert(`Signature: ${signature.substring(0, 20)}...`);
    } catch (error) {
      console.error('Sign test failed:', error);
      alert(`Sign failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 如果有配置错误，显示错误信息
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
          <div className="wallet-actions">
            <button 
              onClick={handleWalletDisconnect}
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
      );
    }

    // If wallet is not connected, don't show any buttons
    // L1 login button will automatically handle wallet connection
    return null;
  };

  return (
    <div className="App">
      <div className="container">
        <h1>zkWasm Mini Rollup - New Provider Pattern</h1>
        
        {/* Provider Pattern Info */}
        <div className="provider-info">
          <h2>🚀 New Provider Design Pattern</h2>
          <p>This example now uses the unified Provider pattern with:</p>
          <ul>
            <li>✅ Unified environment variable handling</li>
            <li>✅ Automatic provider configuration</li>
            <li>✅ Type-safe provider interface</li>
            <li>✅ Support for all React project types</li>
          </ul>
        </div>

        {/* RainbowKit Components Demo */}
        <div className="rainbowkit-demo">
          <h2>🌈 RainbowKit Components (Exported from SDK)</h2>
          <p>These components are directly exported from our SDK - no need to install RainbowKit separately!</p>
          
          <div className="demo-section">
            <h3>ConnectButton Component</h3>
            <ConnectButton />
            <p><small>This is RainbowKit's official ConnectButton component</small></p>
          </div>

          <div className="demo-section">
            <h3>useConnectModal Hook</h3>
            <button 
              onClick={openConnectModal} 
              disabled={!openConnectModal}
              className="rainbow-btn"
            >
              Open Connect Modal
            </button>
            <p><small>Programmatically open RainbowKit's connect modal</small></p>
          </div>

          <div className="demo-section">
            <h3>useAccount Hook</h3>
            <div className="account-status">
              <p><strong>Connected:</strong> {rainbowAccount.isConnected ? 'Yes' : 'No'}</p>
              {rainbowAccount.address && <p><strong>Address:</strong> {rainbowAccount.address}</p>}
              {rainbowAccount.chainId && <p><strong>Chain ID:</strong> {rainbowAccount.chainId}</p>}
            </div>
            <p><small>Direct access to wallet state via Wagmi hooks</small></p>
          </div>
        </div>
        
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
            <h3>Provider Pattern Status</h3>
            <p>✅ Using unified Provider design pattern</p>
            <p>✅ Environment variables loaded via adapter</p>
            <p>✅ Type-safe provider interface</p>
            <p>✅ Automatic provider configuration</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 