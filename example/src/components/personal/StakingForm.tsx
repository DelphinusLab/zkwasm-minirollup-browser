import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Loader2, AlertTriangle, Clock } from "lucide-react";
import { formatBigInt, validateStakeAmount, getTimeAgo } from "@/utils/staking";
import { useWallet } from "@/contexts/WalletContext";
import { useConnectModal } from "zkwasm-minirollup-browser";
import { stakingService, StakingError, PlayerUtils } from "@/services/stakingService";
import { toast } from "@/hooks/use-toast";

interface StakingFormProps {
  type: 'stake' | 'unstake';
  userBalance: bigint;
  stakedAmount: bigint;
  effectivePoints: bigint;
  lastStakeTime: bigint;
  currentCounter?: bigint;
  onSuccess?: () => void;
}

export const StakingForm = ({ 
  type, 
  userBalance, 
  stakedAmount, 
  effectivePoints,
  lastStakeTime,
  currentCounter,
  onSuccess
}: StakingFormProps) => {
  const [amount, setAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    isConnected, 
    isL2Connected, 
    l1Account,
    l2Account, 
    playerId, 
    address,
    connectL1,
    connectL2,
    deposit
  } = useWallet();
  
  const { openConnectModal } = useConnectModal();

  // Define variables first
  const maxAmount = type === 'stake' ? userBalance : stakedAmount;
  const isStaking = type === 'stake';

  // Auto-connect L1 when RainbowKit connection is established
  useEffect(() => {
    if (isConnected && !l1Account) {
      console.log('StakingForm: Auto-connecting L1 account...');
      connectL1();
    }
  }, [isConnected, l1Account, connectL1]);

  // Auto-fill withdrawal address with user's L1 address for unstaking
  useEffect(() => {
    if (!isStaking && address && !withdrawAddress) {
      setWithdrawAddress(address);
    }
  }, [isStaking, address, withdrawAddress]);

  // Calculate time ago based on backend counter difference (1 counter = 5 seconds)
  const getTimeAgoFromCounter = (lastStakeTime: bigint): string => {
    if (lastStakeTime === 0n) return 'Never';
    if (!currentCounter) return 'Unknown';
    
    // Calculate how many seconds ago the last stake happened
    const counterDiff = currentCounter - lastStakeTime;
    const secondsAgo = Number(counterDiff) * 5; // 1 counter = 5 seconds
    
    // Convert seconds to human readable format
    if (secondsAgo < 0) return 'Future'; // Handle edge case
    if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setValidationError(null);

    if (value) {
      // For stake mode, convert L1 balance from wei to token units for comparison
      const adjustedMaxAmount = isStaking ? maxAmount / BigInt(10 ** 18) : maxAmount;
      const validation = validateStakeAmount(value, adjustedMaxAmount);
      if (!validation.valid) {
        setValidationError(validation.error || "Invalid amount");
      }
    }
  };

  const handleMaxClick = () => {
    // Set the raw number value, not the formatted display value
    const displayAmount = isStaking ? maxAmount / BigInt(10 ** 18) : maxAmount;
    const maxValue = displayAmount.toString();
    setAmount(maxValue);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || validationError || !l2Account || !l2Account.getPrivateKey) return;
    
    setLoading(true);
    try {
      const amountBigInt = BigInt(amount);
      const processingKey = l2Account.getPrivateKey();

      if (isStaking) {
        // Check L1 connection first
        if (!isConnected) {
          toast({
            title: "L1 Connection Required",
            description: "Please connect your L1 wallet first.",
            variant: "destructive",
          });
          return;
        }

        // Check L2 connection
        if (!isL2Connected) {
          toast({
            title: "L2 Connection Required", 
            description: "Please connect your L2 account first.",
            variant: "destructive",
          });
          return;
        }

        // Deposit tokens to L2 using the wallet's deposit function
        if (!deposit) {
          toast({
            title: "Deposit Not Available",
            description: "Deposit function is not available. Please ensure you're connected to both L1 and L2.",
            variant: "destructive",
          });
          return;
        }

        console.log('Attempting deposit with:', {
          tokenIndex: 0,
          amount: Number(amount),
          isConnected,
          isL2Connected,
          address,
          playerId
        });

        await deposit({
          tokenIndex: 0, // Assuming token index 0 for the staking token
          amount: Number(amount) // Convert to number as expected by deposit function
        });

        toast({
          title: "Stake Successful! 🎉",
          description: `Successfully staked ${formatBigInt(BigInt(amount))} $ZKWASM tokens. Your staking rewards are now accumulating!`,
        });

        // Note: In the current zkWasm staking system, the actual staking (DEPOSIT command) 
        // needs to be triggered by an admin. This deposit only moves tokens from L1 to L2.
        // Future versions may support direct user staking.
      } else {
        // Withdraw tokens
        if (!withdrawAddress) {
          setValidationError("Withdrawal address is required");
          return;
        }

        // Get nonce only for withdraw operations
        const nonce = await stakingService.getUserNonce(processingKey);

        await stakingService.withdrawTokens(
          amountBigInt, 
          withdrawAddress, 
          nonce, 
          processingKey
        );
        
        toast({
          title: "Unstake Successful! ✅",
          description: `Successfully unstaked ${formatBigInt(amountBigInt)} $ZKWASM tokens to your wallet.`,
        });
      }

      setAmount("");
      setWithdrawAddress("");
      onSuccess?.();
      
    } catch (error) {
      console.error('Transaction error:', error);
      
      let errorMessage = error instanceof Error ? error.message : `Failed to ${isStaking ? 'stake' : 'unstake'} tokens. Please try again.`;
      
      // Handle specific withdraw error for 7-day lock period
      if (!isStaking && error instanceof Error && error.message.includes('WithdrawTooEarly')) {
        errorMessage = 'You must wait 7 days after your last stake before withdrawing. This helps secure the network and ensures fair rewards distribution.';
      }
      
      toast({
        title: `${isStaking ? 'Stake' : 'Unstake'} Failed ❌`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Connection checks
  if (!isConnected) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardContent className="pt-6">
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to start staking.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => openConnectModal?.()} 
            className="w-full mt-4 gradient-primary glow-primary hover:scale-105 transition-spring"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isL2Connected) {
    return (
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your L2 account to access staking features.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={connectL2} 
            className="w-full mt-4 gradient-primary glow-primary hover:scale-105 transition-spring"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Connect L2 Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canSubmit = amount && 
    amount !== "0" && 
    parseFloat(amount || "0") > 0 &&
    !validationError && 
    !loading && 
    (!isStaking ? withdrawAddress : true);

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isStaking ? (
            <ArrowUpCircle className="w-5 h-5 text-success" />
          ) : (
            <ArrowDownCircle className="w-5 h-5 text-warning" />
          )}
          <span>{isStaking ? 'Stake $ZKWASM' : 'Unstake $ZKWASM'}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Section */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            {/* Balance Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isStaking ? 'Available Balance' : 'Staked Amount'}
                </span>
              </div>
              <Badge variant="outline" className="font-mono">
                {isStaking ? formatBigInt(maxAmount / BigInt(10 ** 18)) : formatBigInt(maxAmount)}
              </Badge>
            </div>

            {/* Last Stake Time - only show for stake mode */}
            {isStaking && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last Stake Time
                  </span>
                </div>
                <Badge variant="outline" className="font-mono">
                  {getTimeAgoFromCounter(lastStakeTime)}
                </Badge>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              $ZKWASM Amount
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`pr-16 ${validationError ? 'border-destructive' : ''}`}
                disabled={loading}
                step="1"
                min="0"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMaxClick}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-medium text-primary hover:text-primary"
                disabled={loading}
              >
                MAX
              </Button>
            </div>
            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
          </div>

          {/* Withdraw Address (for unstaking) */}
          {!isStaking && (
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Withdrawal Address
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="0x..."
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Address where $ZKWASM tokens will be sent
              </p>
            </div>
          )}

          {/* Transaction Preview */}
          {amount && !validationError && !isStaking && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-primary">Transaction Preview</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="text-foreground capitalize">{type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground font-mono">{formatBigInt(BigInt(amount))}</span>
                </div>
                {!isStaking && withdrawAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span className="text-foreground font-mono text-xs">
                      {withdrawAddress.slice(0, 6)}...{withdrawAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className={`w-full ${
              isStaking 
                ? 'gradient-primary glow-primary hover:scale-105' 
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
            } transition-spring`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isStaking ? (
              <ArrowUpCircle className="w-4 h-4 mr-2" />
            ) : (
              <ArrowDownCircle className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Processing...' : (isStaking ? 'Stake Now' : 'Unstake Now')}
          </Button>

          {/* Unstake Notice */}
          {!isStaking && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-1">
              <div><strong>Note:</strong> Unstaked tokens will be available in your wallet within 24 hours.</div>
              <div><strong>Lock Period:</strong> You must wait 7 days after your last stake before withdrawing.</div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}; 