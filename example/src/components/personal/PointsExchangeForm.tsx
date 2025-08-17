import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Coins, 
  Wallet, 
  Loader2, 
  AlertTriangle, 
  Calculator,
  Info
} from "lucide-react";
import { formatBigInt } from "@/utils/staking";
import { useWallet } from "@/contexts/WalletContext";
import { useConnectModal } from "zkwasm-minirollup-browser";
import { stakingService, StakingError } from "@/services/stakingService";
import { toast } from "@/hooks/use-toast";
import { STAKING_CONFIG } from "@/config/constants";

interface PointsExchangeFormProps {
  effectivePoints: bigint;
  currentCounter?: bigint;
  onSuccess?: () => void;
}

export const PointsExchangeForm = ({ 
  effectivePoints,
  currentCounter,
  onSuccess
}: PointsExchangeFormProps) => {
  const [activeTab, setActiveTab] = useState("usdt");
  const [amount, setAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    isConnected, 
    isL2Connected, 
    l2Account, 
    address
  } = useWallet();
  
  const { openConnectModal } = useConnectModal();

  // Auto-fill withdrawal address with user's address
  useEffect(() => {
    if (address && !withdrawAddress) {
      setWithdrawAddress(address);
    }
  }, [address, withdrawAddress]);

  const isUsdtExchange = activeTab === "usdt";
  const displayPoints = effectivePoints / 17280n; // Display points divided by 17280
  const maxAmount = isUsdtExchange 
    ? effectivePoints / STAKING_CONFIG.EXCHANGE_RATES.POINTS_PER_USDT
    : effectivePoints / 17280n; // For points withdrawal: show max effective points directly

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setValidationError(null);

    if (value) {
      const amountBigInt = BigInt(value || "0");
      
      if (amountBigInt <= 0n) {
        setValidationError("Amount must be greater than 0");
        return;
      }

      if (isUsdtExchange) {
        if (amountBigInt < STAKING_CONFIG.LIMITS.MIN_USDT_EXCHANGE) {
          setValidationError(`Minimum USDT exchange is ${STAKING_CONFIG.LIMITS.MIN_USDT_EXCHANGE}`);
          return;
        }
        
        const requiredPoints = amountBigInt * STAKING_CONFIG.EXCHANGE_RATES.POINTS_PER_USDT;
        if (requiredPoints > effectivePoints) {
          setValidationError("Insufficient points for this USDT amount");
          return;
        }
      } else {
        // For points withdrawal: user directly specifies effective points to withdraw
        // Convert minimum from raw points to display points (17280 raw = 1 display)
        const minDisplayPoints = STAKING_CONFIG.LIMITS.MIN_POINTS_WITHDRAWAL / 17280n;
        if (amountBigInt < minDisplayPoints) {
          setValidationError(`Minimum points withdrawal is ${minDisplayPoints} effective points`);
          return;
        }
        
        // Convert user input (display points) to raw points for comparison
        const requiredRawPoints = amountBigInt * 17280n;
        if (requiredRawPoints > effectivePoints) {
          setValidationError("Insufficient points for this withdrawal amount");
          return;
        }
      }
    }
  };

  const handleMaxClick = () => {
    const maxValue = maxAmount.toString();
    setAmount(maxValue);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || validationError || !l2Account || !l2Account.getPrivateKey || !withdrawAddress) return;
    
    setLoading(true);
    try {
      const amountBigInt = BigInt(amount);
      const processingKey = l2Account.getPrivateKey();
      const nonce = await stakingService.getUserNonce(processingKey);

      if (isUsdtExchange) {
        await stakingService.withdrawUsdt(amountBigInt, withdrawAddress, nonce, processingKey);
        
        toast({
          title: "USDT Exchange Successful! 💰",
          description: `Successfully exchanged ${formatBigInt(amountBigInt)} USDT. Your points have been deducted accordingly.`,
        });
      } else {
        await stakingService.withdrawPoints(amountBigInt, withdrawAddress, nonce, processingKey);
        
        toast({
          title: "Points Withdrawal Successful! 🎯",
          description: `Successfully withdrew ${formatBigInt(amountBigInt)} points to your wallet.`,
        });
      }

      setAmount("");
      onSuccess?.();
      
    } catch (error) {
      console.error('Transaction error:', error);
      
      let errorMessage = error instanceof Error ? error.message : `Failed to ${isUsdtExchange ? 'exchange USDT' : 'withdraw points'}. Please try again.`;
      
      toast({
        title: `${isUsdtExchange ? 'USDT Exchange' : 'Points Withdrawal'} Failed ❌`,
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
              Please connect your wallet to exchange points.
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
              Please connect your L2 account to exchange points.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const canSubmit = amount && 
    amount !== "0" && 
    parseFloat(amount || "0") > 0 &&
    !validationError && 
    !loading && 
    withdrawAddress;

  // Calculate exchange preview
  const getExchangePreview = () => {
    if (!amount) return null;
    
    const amountBigInt = BigInt(amount || "0");
    if (isUsdtExchange) {
      // For USDT exchange: user pays points to get USDT
      // 1 USDT = 1,728,000,000 raw points = 100,000 display points (1,728,000,000 / 17280)
      const requiredDisplayPoints = amountBigInt * 100000n; // 100,000 display points per USDT
      return {
        input: `${formatBigInt(requiredDisplayPoints)} Points`,
        output: `${formatBigInt(amountBigInt)} USDT`,
        rate: `100,000 Points = 1 USDT`
      };
    } else {
      // For Points withdrawal: user withdraws effective points directly
      return {
        input: `${formatBigInt(amountBigInt)} Effective Points`,
        output: `${formatBigInt(amountBigInt)} Effective Points on BNB Chain`,
        rate: null // No rate needed for direct withdrawal
      };
    }
  };

  const exchangePreview = getExchangePreview();

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-primary" />
          <span>Points Exchange</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="usdt" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Exchange USDT</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center space-x-2">
              <Coins className="w-4 h-4" />
              <span>Withdraw Points</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usdt" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Available Points
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {displayPoints.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Max USDT Exchange
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatBigInt(maxAmount)}
                  </Badge>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="usdt-amount" className="text-sm font-medium">
                  USDT Amount
                </Label>
                <div className="relative">
                  <Input
                    id="usdt-amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`pr-16 ${validationError ? 'border-destructive' : ''}`}
                    disabled={loading}
                    step="1"
                    min="1"
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

              {/* Withdraw Address */}
              <div className="space-y-2">
                <Label htmlFor="usdt-address" className="text-sm font-medium">
                  USDT Receiving Address
                </Label>
                <Input
                  id="usdt-address"
                  type="text"
                  placeholder="0x..."
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="font-mono"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Address where USDT will be sent
                </p>
              </div>

              {/* Exchange Preview */}
              {exchangePreview && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium text-primary">Exchange Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You Pay:</span>
                      <span className="text-foreground font-mono">{exchangePreview.input}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You Get:</span>
                      <span className="text-foreground font-mono">{exchangePreview.output}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="text-foreground font-mono text-xs">{exchangePreview.rate}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full gradient-primary glow-primary hover:scale-105 transition-spring"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Processing...' : 'Exchange USDT'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="points" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Available Points
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {displayPoints.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Max Points Withdrawal
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {maxAmount.toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="points-amount" className="text-sm font-medium">
                  Effective Points Amount
                </Label>
                <div className="relative">
                  <Input
                    id="points-amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`pr-16 ${validationError ? 'border-destructive' : ''}`}
                    disabled={loading}
                    step="1"
                    min="1"
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

              {/* Withdraw Address */}
              <div className="space-y-2">
                <Label htmlFor="points-address" className="text-sm font-medium">
                  Points Receiving Address
                </Label>
                <Input
                  id="points-address"
                  type="text"
                  placeholder="0x..."
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="font-mono"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Address where points will be sent
                </p>
              </div>

              {/* Exchange Preview */}
              {exchangePreview && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium text-primary">Withdrawal Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You Withdraw:</span>
                      <span className="text-foreground font-mono">{exchangePreview.input}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You Get:</span>
                      <span className="text-foreground font-mono">{exchangePreview.output}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-warning text-warning-foreground hover:bg-warning/90 transition-spring"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Coins className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Processing...' : 'Withdraw Points'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Info Notice */}
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-1 mt-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div><strong>USDT Exchange:</strong> Convert your staking points to USDT at a fixed rate of 100,000 points = 1 USDT. Minimum withdrawal: 1 USDT.</div>
              <div><strong>Points Withdrawal:</strong> Withdraw your points directly to your wallet. Withdrawn points cannot be recharged back for USDT exchange, they can be used for participating in launchpad IDO or other activities.</div>
              <div><strong>Processing Time:</strong> Transactions are processed within 24 hours.</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 