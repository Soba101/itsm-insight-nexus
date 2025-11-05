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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [ticketId, setTicketId] = useState("INC0001234");
  const [searchId, setSearchId] = useState("INC0001234");

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
