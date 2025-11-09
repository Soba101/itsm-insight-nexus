import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { SeriesPoint } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendCardProps {
  data: SeriesPoint[];
  title?: string;
}

type TrendTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: SeriesPoint;
  }>;
};

export function TrendCard({ data, title = "Ticket Trend" }: TrendCardProps) {
  const CustomTooltip = ({ active, payload }: TrendTooltipProps) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const firstPoint = payload[0];
    const dataPoint = firstPoint?.payload as SeriesPoint | undefined;

    if (!dataPoint) {
      return null;
    }

    return (
      <div className="bg-popover p-3 rounded-lg border border-border shadow-lg">
        <p className="font-semibold text-sm">
          {new Date(dataPoint.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-sm mt-1">
          <span className="text-muted-foreground">Tickets: </span>
          <span className="font-semibold text-chart-1">{dataPoint.count}</span>
        </p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <TooltipProvider delayDuration={200}>
            <InfoTooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" side="top">
                <p className="font-semibold mb-1">Historical Ticket Volume</p>
                <p className="text-xs">
                  • Track ticket creation patterns over time{"\n"}
                  • Look for spikes indicating incidents or outages{"\n"}
                  • Identify seasonal trends and recurring problems{"\n"}
                  • Compare periods to measure workload changes{"\n"}
                  • Helps predict future resource needs
                </p>
              </TooltipContent>
            </InfoTooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
