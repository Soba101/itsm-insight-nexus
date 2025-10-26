import { Card, CardContent } from "@/components/ui/card";
import { TicketsResponse } from "@/lib/types";
import { Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface TicketsStatsProps {
  data?: TicketsResponse;
}

export function TicketsStats({ data }: TicketsStatsProps) {
  if (!data) return null;

  const openCount = data.items.filter(t => t.status === "Open").length;
  const inProgressCount = data.items.filter(t => t.status === "In Progress").length;
  const resolvedCount = data.items.filter(t => t.status === "Resolved").length;

  const stats = [
    {
      label: "Total Tickets",
      value: data.total,
      icon: Ticket,
      color: "text-primary",
    },
    {
      label: "Open",
      value: openCount,
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: Clock,
      color: "text-warning",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
      color: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
