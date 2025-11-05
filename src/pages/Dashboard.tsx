import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar } from "@/components/FilterBar";
import { TrendCard } from "@/components/TrendCard";
import { BreakdownCard } from "@/components/BreakdownCard";
import { Filters } from "@/lib/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["kpis", filters],
    queryFn: () => api.getKPIs(filters),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ["trend", filters],
    queryFn: () => api.getTicketsTrend(filters),
  });

  const { data: priorityBreakdown } = useQuery({
    queryKey: ["breakdown", "priority", filters],
    queryFn: () => api.getBreakdown("priority", filters),
  });

  const { data: categoryBreakdown } = useQuery({
    queryKey: ["breakdown", "category", filters],
    queryFn: () => api.getBreakdown("category", filters),
  });

  const { data: assignmentBreakdown } = useQuery({
    queryKey: ["breakdown", "assignment_group", filters],
    queryFn: () => api.getBreakdown("assignment_group", filters),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ITSM Analytics Dashboard</h1>
        <p className="text-muted-foreground">Monitor and analyze your IT service management metrics</p>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpisLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : kpis ? (
          <>
            <KpiCard
              title="Total Tickets"
              value={kpis.total}
              tooltip="Total number of tickets in the system"
            />
            <KpiCard
              title="Open Tickets"
              value={kpis.open}
              tooltip="Currently open tickets"
            />
            <KpiCard
              title="Resolved"
              value={kpis.resolved}
              tooltip="Tickets that have been resolved"
            />
            <KpiCard
              title="SLA Compliance"
              value={`${((kpis.sla_compliance ?? 0) * 100).toFixed(1)}%`}
              tooltip="Percentage of tickets meeting SLA"
            />
            <KpiCard
              title="MTTR"
              value={`${(kpis.mttr_hours ?? 0).toFixed(1)}h`}
              tooltip="Mean Time To Resolution"
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {trendLoading ? (
            <Skeleton className="h-96" />
          ) : trend && Array.isArray(trend) ? (
            <TrendCard data={trend} title="Tickets Over Time" />
          ) : null}
        </div>
        <div>
          {priorityBreakdown && categoryBreakdown && assignmentBreakdown ? (
            <BreakdownCard
              priorityData={Array.isArray(priorityBreakdown) ? priorityBreakdown : []}
              categoryData={Array.isArray(categoryBreakdown) ? categoryBreakdown : []}
              assignmentData={Array.isArray(assignmentBreakdown) ? assignmentBreakdown : []}
            />
          ) : (
            <Skeleton className="h-96" />
          )}
        </div>
      </div>
    </div>
  );
}
