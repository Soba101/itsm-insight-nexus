import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: number;
  tooltip?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function KpiCard({ title, value, delta, tooltip, variant = "default" }: KpiCardProps) {
  const getDeltaColor = () => {
    if (!delta) return "";
    return delta > 0 ? "success" : "destructive";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-success/20 shadow-glow";
      case "warning":
        return "border-warning/20 shadow-glow";
      case "destructive":
        return "border-destructive/20 shadow-glow";
      default:
        return "border-border hover:shadow-md";
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:scale-105 hover:shadow-lg",
      getVariantStyles()
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" side="top">
                <p className="text-xs whitespace-pre-line">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {value}
        </div>
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <Badge variant={getDeltaColor() as any} className="font-semibold">
              {delta > 0 ? "+" : ""}
              {delta}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
