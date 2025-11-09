import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: number;
  tooltip?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function KpiCard({ title, value, delta, tooltip, variant = "default" }: KpiCardProps) {
  const getVariantStyles = () => {
    const baseStyles = "relative backdrop-blur-sm";
    
    switch (variant) {
      case "success":
        return cn(
          baseStyles,
          "bg-gradient-to-br from-success/5 to-success/10",
          "border-success/30 shadow-success/10",
          "hover:border-success/50 hover:shadow-success/20"
        );
      case "warning":
        return cn(
          baseStyles,
          "bg-gradient-to-br from-warning/5 to-warning/10",
          "border-warning/30 shadow-warning/10",
          "hover:border-warning/50 hover:shadow-warning/20"
        );
      case "destructive":
        return cn(
          baseStyles,
          "bg-gradient-to-br from-destructive/5 to-destructive/10",
          "border-destructive/30 shadow-destructive/10",
          "hover:border-destructive/50 hover:shadow-destructive/20"
        );
      default:
        return cn(
          baseStyles,
          "bg-gradient-to-br from-card to-muted/20",
          "border-border/60",
          "hover:border-primary/30 hover:shadow-primary/10"
        );
    }
  };

  const getAccentColor = () => {
    switch (variant) {
      case "success": return "text-success";
      case "warning": return "text-warning";
      case "destructive": return "text-destructive";
      default: return "text-primary";
    }
  };

  const getDeltaStyles = () => {
    if (delta === undefined || delta === 0) {
      return {
        icon: Minus,
        textColor: "text-muted-foreground",
        bgColor: "bg-muted/50",
      };
    }
    
    if (delta > 0) {
      return {
        icon: TrendingUp,
        textColor: "text-success",
        bgColor: "bg-success/10",
      };
    }
    
    return {
      icon: TrendingDown,
      textColor: "text-destructive",
      bgColor: "bg-destructive/10",
    };
  };

  const deltaConfig = getDeltaStyles();
  const DeltaIcon = deltaConfig.icon;

  return (
    <Card className={cn(
      "group relative z-0 transition-all duration-300",
      "hover:z-20 hover:scale-[1.02] hover:shadow-xl",
      getVariantStyles()
    )}>
      {/* Decorative gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[inherit]" />
      
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </h3>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="inline-flex items-center opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="More information"
                    >
                      <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="top" align="start">
                    <div className="text-xs leading-relaxed whitespace-pre-line">
                      {tooltip}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Main Value */}
        <div className={cn(
          "text-4xl font-bold tracking-tight transition-all duration-300",
          "group-hover:scale-105",
          getAccentColor()
        )}>
          {value}
        </div>
        
        {/* Delta Indicator */}
        {delta !== undefined && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
            "transition-all duration-300",
            deltaConfig.bgColor
          )}>
            <DeltaIcon className={cn("h-3.5 w-3.5", deltaConfig.textColor)} />
            <span className={cn("text-xs font-semibold", deltaConfig.textColor)}>
              {delta > 0 ? "+" : ""}{Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
