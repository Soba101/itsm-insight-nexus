import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {delta !== undefined && (
          <Badge variant={getDeltaColor() as any} className="mt-2">
            {delta > 0 ? "+" : ""}
            {delta}%
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
