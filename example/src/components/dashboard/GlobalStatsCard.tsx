import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/utils/staking";
import { priceService } from "@/services/priceService";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

interface GlobalStatsCardProps {
  title: string;
  value: string | number | bigint;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  loading?: boolean;
  description?: string;
  format?: 'number' | 'bigint' | 'string' | 'apy';
}

export const GlobalStatsCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false,
  description,
  format = 'number'
}: GlobalStatsCardProps) => {
  const formatValue = (val: string | number | bigint) => {
    if (loading) return '';
    
    switch (format) {
      case 'bigint':
        return typeof val === 'bigint' ? formatNumber(Number(val)) : String(val);
      case 'number':
        return typeof val === 'number' ? formatNumber(val) : String(val);
      case 'apy':
        return typeof val === 'number' ? priceService.formatAPY(val) : String(val);
      case 'string':
      default:
        return String(val);
    }
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="w-3 h-3" />;
      case 'decrease':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-success';
      case 'decrease':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="card-hover bg-gradient-to-br from-card to-card/80 border-border/50 overflow-hidden relative">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary/80">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="space-y-2">
          {loading ? (
            <div className="h-8 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatValue(value)}
            </div>
          )}
          
          {change && !loading && (
            <div className={`flex items-center space-x-1 text-xs ${getChangeColor()}`}>
              {getChangeIcon()}
              <span>
                {change.value > 0 ? '+' : ''}{change.value}%
              </span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};