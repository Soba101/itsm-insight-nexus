import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar } from "@/components/FilterBar";
import { TrendCard } from "@/components/TrendCard";
import { BreakdownCard } from "@/components/BreakdownCard";
import { TopicsPanel } from "@/components/TopicsPanel";
import { DuplicatesPanel } from "@/components/DuplicatesPanel";
import { GraphViewer } from "@/components/GraphViewer";
import { Filters, Priority, TicketStatus, GraphCandidate } from "@/lib/types";
import { api } from "@/lib/api";
import { cn, formatMTTR, getSLAVariant } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const [ticketId, setTicketId] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);
  const [graphFilters, setGraphFilters] = useState<{
    search: string;
    relation: "all" | "roots" | "children";
    priority?: Priority;
    status?: TicketStatus;
  }>({
    search: "",
    relation: "all",
    priority: undefined,
    status: undefined,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh interval (5 minutes)
  const REFRESH_INTERVAL = 5 * 60 * 1000;

  const { 
    data: kpiData, 
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
    dataUpdatedAt: kpisUpdatedAt
  } = useQuery({
    queryKey: ["kpi-trends", filters],
    queryFn: () => api.getKPITrends(filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const kpis = kpiData?.current;
  const deltas = kpiData?.delta;

  const { 
    data: trend, 
    isLoading: trendLoading,
    error: trendError 
  } = useQuery({
    queryKey: ["trend", filters],
    queryFn: () => api.getTicketsTrend(filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: priorityBreakdown,
    error: priorityError 
  } = useQuery({
    queryKey: ["breakdown", "priority", filters],
    queryFn: () => api.getBreakdown("priority", filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: categoryBreakdown,
    error: categoryError 
  } = useQuery({
    queryKey: ["breakdown", "category", filters],
    queryFn: () => api.getBreakdown("category", filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: assignmentBreakdown,
    error: assignmentError 
  } = useQuery({
    queryKey: ["breakdown", "assignment_group", filters],
    queryFn: () => api.getBreakdown("assignment_group", filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: topics, 
    isLoading: topicsLoading,
    error: topicsError 
  } = useQuery({
    queryKey: ["topics", filters],
    queryFn: () => api.getTopics(filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const { 
    data: duplicates, 
    isLoading: duplicatesLoading,
    error: duplicatesError 
  } = useQuery({
    queryKey: ["duplicates", filters],
    queryFn: () => api.getDuplicates(filters),
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
    retry: 2,
  });

  const {
    data: graphCandidates,
    isLoading: graphCandidatesLoading,
    error: graphCandidatesError,
  } = useQuery({
    queryKey: [
      "graph-candidates",
      graphFilters.relation,
      graphFilters.priority ?? "all",
      graphFilters.status ?? "all",
      graphFilters.search,
    ],
    queryFn: () =>
      api.getGraphCandidates({
        search: graphFilters.search,
        relation: graphFilters.relation,
        priority: graphFilters.priority,
        status: graphFilters.status,
        limit: 80,
      }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { 
    data: graphData, 
    isLoading: graphLoading,
    error: graphError 
  } = useQuery({
    queryKey: ["graph", searchId ?? ""],
    queryFn: () => api.getGraphLinks(searchId as string),
    enabled: Boolean(searchId),
    retry: 2,
  });

  useEffect(() => {
    if (!searchId && graphCandidates && graphCandidates.length > 0) {
      const first = graphCandidates[0];
      if (first?.incident_number) {
        setTicketId(first.incident_number);
        setSearchId(first.incident_number);
      }
    }
  }, [searchId, graphCandidates]);

  // Format last updated timestamp
  const lastUpdated = useMemo(() => {
    if (!kpisUpdatedAt) return null;
    const date = new Date(kpisUpdatedAt);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }, [kpisUpdatedAt]);

  // Check if any data has errors
  const hasErrors = kpisError || trendError || priorityError || 
                   categoryError || assignmentError || topicsError || duplicatesError;

  const graphTickets = graphCandidates ?? [];
  const selectedCandidate = searchId
    ? graphTickets.find((ticket) => ticket.incident_number === searchId)
    : undefined;

  const relationOptions: { value: "all" | "roots" | "children"; label: string }[] = [
    { value: "all", label: "All linked tickets" },
    { value: "roots", label: "Root tickets" },
    { value: "children", label: "Child tickets" },
  ];

  const priorityOptions: { value: Priority | "all"; label: string }[] = [
    { value: "all", label: "All priorities" },
    { value: "P1", label: "Priority P1" },
    { value: "P2", label: "Priority P2" },
    { value: "P3", label: "Priority P3" },
    { value: "P4", label: "Priority P4" },
  ];

  const statusOptions: { value: TicketStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
  ];

  const handleSearch = () => {
    const nextId = ticketId.trim();
    if (!nextId) return;
    setTicketId(nextId);
    setSearchId(nextId);
  };

  const handleManualRefresh = () => {
    refetchKpis();
  };

  return (
    <div className="space-y-6">
      {/* Header with status indicators */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ITSM Analytics Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze your IT service management metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Last updated: <span className="font-medium">{lastUpdated}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={kpisLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${kpisLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            {autoRefresh ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Auto-refresh On
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Auto-refresh Off
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some dashboard data failed to load. Please check your connection and try refreshing.
            {kpisError && <div className="mt-1 text-xs">KPIs: {(kpisError as Error).message}</div>}
          </AlertDescription>
        </Alert>
      )}

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
        ) : (
          <div className="col-span-full flex items-center justify-center p-8 text-muted-foreground">
            <p>No KPI data available. Please check your data source connection in Settings.</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {trendLoading ? (
            <Skeleton className="h-96" />
          ) : trendError ? (
            <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-card p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Failed to load trend data</p>
              <p className="text-xs text-muted-foreground mt-2">{(trendError as Error).message}</p>
            </div>
          ) : trend && Array.isArray(trend) && trend.length > 0 ? (
            <TrendCard data={trend} title="Tickets Over Time" />
          ) : (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-card">
              <p className="text-muted-foreground">No trend data available for selected filters</p>
            </div>
          )}
        </div>
        <div>
          {(priorityBreakdown && categoryBreakdown && assignmentBreakdown) ? (
            <BreakdownCard
              priorityData={Array.isArray(priorityBreakdown) ? priorityBreakdown : []}
              categoryData={Array.isArray(categoryBreakdown) ? categoryBreakdown : []}
              assignmentData={Array.isArray(assignmentBreakdown) ? assignmentBreakdown : []}
            />
          ) : (priorityError || categoryError || assignmentError) ? (
            <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-card p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Failed to load breakdown data</p>
            </div>
          ) : (
            <Skeleton className="h-96" />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {topicsLoading ? (
            <Skeleton className="h-96" />
          ) : topicsError ? (
            <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-card p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Failed to load topics</p>
              <p className="text-xs text-muted-foreground mt-2">{(topicsError as Error).message}</p>
            </div>
          ) : topics && Array.isArray(topics) && topics.length > 0 ? (
            <TopicsPanel topics={topics} />
          ) : (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-card">
              <p className="text-muted-foreground">No topics data available</p>
            </div>
          )}
        </div>
        <div>
          {duplicatesLoading ? (
            <Skeleton className="h-96" />
          ) : duplicatesError ? (
            <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-card p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Failed to load duplicates</p>
              <p className="text-xs text-muted-foreground mt-2">{(duplicatesError as Error).message}</p>
            </div>
          ) : duplicates && Array.isArray(duplicates) && duplicates.length > 0 ? (
            <DuplicatesPanel clusters={duplicates} />
          ) : (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-card">
              <p className="text-muted-foreground">No duplicate clusters found</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Ticket Graph Filters</h3>
              <p className="text-xs text-muted-foreground">
                Discover linked tickets instantly—select one to render the relationship graph.
              </p>
            </div>
            <Input
              placeholder="Search by ticket ID or keywords"
              value={graphFilters.search}
              onChange={(e) => setGraphFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                value={graphFilters.relation}
                onValueChange={(value) =>
                  setGraphFilters((prev) => ({ ...prev, relation: value as "all" | "roots" | "children" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Relation" />
                </SelectTrigger>
                <SelectContent>
                  {relationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={graphFilters.priority ?? "all"}
                onValueChange={(value) =>
                  setGraphFilters((prev) => ({
                    ...prev,
                    priority: value === "all" ? undefined : (value as Priority),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={graphFilters.status ?? "all"}
                onValueChange={(value) =>
                  setGraphFilters((prev) => ({
                    ...prev,
                    status: value === "all" ? undefined : (value as TicketStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticket ID..."
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!ticketId.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Load Graph
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Linked tickets</p>
                <p className="text-xs text-muted-foreground">Select a ticket to visualize its relationships.</p>
              </div>
              <Badge variant="secondary">{graphTickets.length}</Badge>
            </div>
            <div className="h-[340px]">
              {graphCandidatesLoading ? (
                <div className="flex h-full items-center justify-center px-4">
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : graphCandidatesError ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Failed to load linked tickets: {graphCandidatesError instanceof Error ? graphCandidatesError.message : "Unknown error"}
                  </p>
                </div>
              ) : graphTickets.length > 0 ? (
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {graphTickets.map((ticket) => {
                      const isActive = ticket.incident_number === searchId;
                      const relationLabel = ticket.parent_incident
                        ? ticket.child_count > 0
                          ? "Parent & Child"
                          : "Child"
                        : ticket.child_count > 0
                          ? "Parent"
                          : "Linked";
                      return (
                        <button
                          key={ticket.incident_number}
                          type="button"
                          onClick={() => {
                            setTicketId(ticket.incident_number);
                            setSearchId(ticket.incident_number);
                          }}
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                            isActive
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{ticket.incident_number}</span>
                            <Badge variant={isActive ? "default" : "outline"}>{relationLabel}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {ticket.short_description || "No description available"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {ticket.state && <span className="capitalize">State: {ticket.state.toLowerCase()}</span>}
                            {ticket.priority && <span>Priority: P{ticket.priority}</span>}
                            <span>Links: {ticket.child_count + (ticket.parent_incident ? 1 : 0)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No linked tickets found. Adjust your filters or run the relationship script to populate matches.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {searchId ? (
            selectedCandidate ? (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight">{selectedCandidate.incident_number}</h3>
                      <Badge variant="outline">
                        {selectedCandidate.parent_incident
                          ? selectedCandidate.child_count > 0
                            ? "Parent & Child"
                            : "Child ticket"
                          : selectedCandidate.child_count > 0
                            ? "Parent ticket"
                            : "Linked ticket"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedCandidate.short_description || "No description available"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    {selectedCandidate.parent_incident && (
                      <span>Parent: {selectedCandidate.parent_incident}</span>
                    )}
                    <span>Children: {selectedCandidate.child_count}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold">Loading ticket details</h3>
                <p className="text-xs text-muted-foreground">
                  Showing graph for {searchId}. This ticket is not in the filtered list but can still be visualized.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold">Select a ticket</h3>
              <p className="text-xs text-muted-foreground">
                Choose a ticket from the list or enter an incident number to explore its relationships.
              </p>
            </div>
          )}

          {graphLoading ? (
            <Skeleton className="h-[600px]" />
          ) : graphError ? (
            <div className="flex flex-col items-center justify-center h-[600px] border rounded-lg bg-card p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground">Failed to load graph for ticket {searchId ?? ticketId}</p>
              <p className="text-xs text-muted-foreground mt-2">{(graphError as Error).message}</p>
            </div>
          ) : graphData && searchId ? (
            <GraphViewer data={graphData} />
          ) : searchId ? (
            <div className="flex items-center justify-center h-[600px] border rounded-lg bg-card">
              <p className="text-muted-foreground">No graph data available for ticket {searchId}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px] border rounded-lg bg-card">
              <p className="text-muted-foreground">Select a ticket to display its relationship graph.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
