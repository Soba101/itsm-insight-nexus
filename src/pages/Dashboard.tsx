import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar } from "@/components/FilterBar";
import { TrendCard } from "@/components/TrendCard";
import { BreakdownCard } from "@/components/BreakdownCard";
import { TopicsPanel } from "@/components/TopicsPanel";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";
import { GraphViewer } from "@/components/GraphViewer";
import { Filters } from "@/lib/types";
import { api } from "@/lib/api";
import { formatMTTR, getSLAVariant } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [ticketId, setTicketId] = useState("INC0001234");
  const [searchId, setSearchId] = useState("INC0001234");

  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ["kpi-trends", filters],
    queryFn: () => api.getKPITrends(filters),
  });

  const kpis = kpiData?.current;
  const deltas = kpiData?.delta;

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

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics", filters],
    queryFn: () => api.getTopics(filters),
  });

  const { data: duplicates, isLoading: duplicatesLoading } = useQuery({
    queryKey: ["duplicates", filters],
    queryFn: () => api.getDuplicates(filters),
  });

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ["graph", searchId],
    queryFn: () => api.getGraphLinks(searchId),
    enabled: !!searchId,
  });

  const handleSearch = () => {
    setSearchId(ticketId);
  };

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
              delta={deltas?.total}
              tooltip={`Total number of tickets in the selected period\n• All statuses included (open, in progress, resolved)\n• Updated continuously from your ITSM system\n• Use filters above to narrow by date, priority, or status`}
            />
            <KpiCard
              title="Open Tickets"
              value={kpis.open}
              delta={deltas?.open}
              tooltip={`Currently open tickets requiring attention\n• Includes: New, Assigned, In Progress\n• Open rate: ${kpis.total > 0 ? ((kpis.open / kpis.total) * 100).toFixed(1) : 0}% of total tickets\n• Monitor for aging tickets that need escalation`}
            />
            <KpiCard
              title="Resolved"
              value={kpis.resolved}
              delta={deltas?.resolved}
              tooltip={`Tickets successfully resolved in the period\n• Resolution rate: ${kpis.total > 0 ? ((kpis.resolved / kpis.total) * 100).toFixed(1) : 0}%\n• Target: Maintain >60% resolution rate\n• Closed and verified tickets`}
            />
            <KpiCard
              title="SLA Compliance"
              value={`${((kpis.sla_compliance ?? 0) * 100).toFixed(1)}%`}
              delta={deltas?.sla_compliance}
              variant={getSLAVariant((kpis.sla_compliance ?? 0) * 100)}
              tooltip={`Percentage of tickets meeting SLA targets\n• Industry benchmark: 85-95%\n• Current: ${((kpis.sla_compliance ?? 0) * 100).toFixed(1)}%\n• At-risk tickets require immediate attention\n• Based on response and resolution time targets`}
            />
            <KpiCard
              title="MTTR"
              value={formatMTTR(kpis.mttr_hours ?? 0)}
              delta={deltas?.mttr_hours ? -deltas.mttr_hours : undefined}
              tooltip={`Mean Time To Resolution (average resolution time)\n• Industry benchmark: 24-48 hours\n• Current: ${formatMTTR(kpis.mttr_hours ?? 0)} (${(kpis.mttr_hours ?? 0).toFixed(1)} hours)\n• Lower is better - indicates faster problem resolution\n• Varies by priority: P1 faster, P3-P4 slower`}
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

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {topicsLoading ? (
            <Skeleton className="h-96" />
          ) : topics ? (
            <TopicsPanel topics={topics} />
          ) : null}
        </div>
        <div>
          {duplicatesLoading ? (
            <Skeleton className="h-96" />
          ) : duplicates ? (
            <DuplicatesPanel clusters={duplicates} />
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ticket ID..."
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Load Graph
          </Button>
        </div>

        {graphLoading ? (
          <Skeleton className="h-[600px]" />
        ) : graphData ? (
          <GraphViewer data={graphData} />
        ) : null}
      </div>
    </div>
  );
}
