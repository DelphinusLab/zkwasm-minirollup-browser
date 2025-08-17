import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Link } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useConnectModal } from "zkwasm-minirollup-browser";

export const Header = () => {
  const { 
    isConnected, 
    isL2Connected, 
    address, 
    playerId,
    l1Account,
    connectL2,
    disconnect
  } = useWallet();
  
  const { openConnectModal } = useConnectModal();

  const truncateAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Handle wallet connection
  const handleWalletClick = async () => {
    try {
      if (!isConnected) {
        // 如果L1未连接，打开连接模态框
        console.log('Opening wallet connect modal...');
        openConnectModal?.();
      } else if (!isL2Connected) {
        // 如果L1已连接但L2未连接，连接L2
        console.log('Connecting L2 account...');
        await connectL2();
      } else {
        // 已经完全连接
        console.log('Wallet already fully connected');
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      // Check for specific error codes from SDK
      if (error?.code === 'SESSION_EXPIRED') {
        // SDK has already cleared the session, just disconnect wagmi
        disconnect();
      } else if (error?.message?.includes('User rejected') || 
                 error?.message?.includes('User cancelled')) {
        // User cancelled - no need to show error
        console.log('User cancelled wallet connection');
      } else {
        alert(`Failed to connect wallet: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img 
              src="/wasm-logo-quare.svg" 
              alt="zkWasm Logo" 
              className="w-10 h-10"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ZKWASM</h1>
            <p className="text-sm text-muted-foreground">Staking Platform</p>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <Card className="px-3 py-2 bg-secondary border-border">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isL2Connected ? 'bg-success' : 'bg-warning'}`}></div>
                  <span className="text-sm font-mono text-foreground">
                    {address && truncateAddress(address)}
                  </span>
                  {isL2Connected && playerId && (
                    <Badge variant="outline" className="text-xs ml-2">
                      L2
                    </Badge>
                  )}
                </div>
              </Card>
              
              {!isL2Connected && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    console.log('🔘 Connect L2 button clicked');
                    try {
                      console.log('🚀 Calling connectL2()...');
                      await connectL2();
                      console.log('✅ connectL2() completed successfully');
                    } catch (error: any) {
                      console.error('❌ L2 connection failed:', error);
                      
                      // Check for specific error codes from SDK
                      if (error?.code === 'SESSION_EXPIRED') {
                        // SDK has already cleared the session, just disconnect wagmi
                        disconnect();
                      } else if (error?.message?.includes('User rejected') || 
                                 error?.message?.includes('User cancelled')) {
                        console.log('User cancelled L2 connection');
                      } else {
                        alert(`Failed to connect L2: ${error?.message || 'Unknown error'}`);
                      }
                    }
                  }}
                  className="border-border hover:bg-primary/10"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Connect L2
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleWalletClick} 
              className="gradient-primary glow-primary hover:scale-105 transition-spring"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};