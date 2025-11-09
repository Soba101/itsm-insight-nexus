import axios from "axios";
import {
  KPI,
  SeriesPoint,
  Breakdown,
  TicketsResponse,
  NLPTopic,
  DuplicateCluster,
  Summary,
  GraphData,
  GraphCandidate,
  Filters,
  Ticket,
  ServiceNowIncident,
  mapServiceNowIncidentToTicket,
  SimilaritySearchResponse,
  TicketFamilyResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  Priority,
  TicketStatus,
} from "./types";

// Lazy import Supabase client only when needed
const getSupabase = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

const getSettings = () => {
  const stored = localStorage.getItem("itsm-settings");
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    apiBaseUrl: "http://localhost:3000",
    authToken: "",
    dataSource: "docker" as "docker" | "supabase",
  };
};

const createAxiosInstance = () => {
  const settings = getSettings();
  return axios.create({
    baseURL: settings.apiBaseUrl,
    headers: settings.authToken
      ? { Authorization: `Bearer ${settings.authToken}` }
      : {},
  });
};

export const api = {
  // Helper function to fetch all tickets for calculation
  async getAllTicketsForCalculation(filters: Filters): Promise<Ticket[]> {
    const settings = getSettings();
    
    if (settings.dataSource === "supabase") {
      const supabase = await getSupabase();
      let query = supabase.from("servicenow_incidents").select("*");
      
      // Apply filters - map from Ticket fields to ServiceNow fields
      if (filters.query) query = query.ilike("short_description", `%${filters.query}%`);
      if (filters.priority) {
        // Map P1-P4 to ServiceNow priority 1-5
        const priorityMap: Record<Priority, string> = { P1: "1", P2: "2", P3: "3", P4: "4" };
        const snPriority = priorityMap[filters.priority];
        if (snPriority) query = query.eq("priority", snPriority);
      }
      if (filters.ticketType && filters.ticketType !== "incident") {
        // ServiceNow incidents table only contains incidents, filter out non-incidents
        return [];
      }
      if (filters.status) {
        // Map Ticket status to ServiceNow state
        const statusMap: Record<TicketStatus, string[]> = {
          Open: ["New"],
          "In Progress": ["In Progress", "On Hold"],
          Resolved: ["Resolved"],
          Closed: ["Closed", "Cancelled"],
        };
        const states = statusMap[filters.status];
        if (states && states.length === 1) {
          query = query.eq("state", states[0]);
        } else if (states && states.length > 1) {
          query = query.in("state", states);
        }
      }
      if (filters.service) query = query.eq("business_service", filters.service);
      if (filters.assignmentGroup) query = query.eq("assignment_group", filters.assignmentGroup);
      if (filters.dateFrom) query = query.gte("opened_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("opened_at", filters.dateTo);
      
  const { data, error } = await query.returns<ServiceNowIncident[]>();
      if (error) throw error;
      
      // Map ServiceNow incidents to Ticket format
  const incidents = (data ?? []) as ServiceNowIncident[];
  return incidents.map((incident) => mapServiceNowIncidentToTicket(incident));
    }
    
    // Docker/PostgREST mode - fetch all tickets from servicenow_incidents
    const instance = createAxiosInstance();
  const params: Record<string, string | number> = { limit: 1000 }; // Get up to 1000 tickets for calculation
    
    if (filters.query) params.short_description = `ilike.*${filters.query}*`;
    if (filters.priority) {
      const priorityMap: Record<Priority, string> = { P1: "1", P2: "2", P3: "3", P4: "4" };
      const snPriority = priorityMap[filters.priority];
      if (snPriority) params.priority = `eq.${snPriority}`;
    }
    if (filters.ticketType && filters.ticketType !== "incident") {
      return []; // Only incidents in servicenow_incidents table
    }
    if (filters.status) {
      const statusMap: Record<TicketStatus, string[]> = {
        Open: ["New"],
        "In Progress": ["In Progress", "On Hold"],
        Resolved: ["Resolved"],
        Closed: ["Closed", "Cancelled"],
      };
      const states = statusMap[filters.status];
      if (states && states.length === 1) {
        params.state = `eq.${states[0]}`;
      } else if (states && states.length > 1) {
        params.state = `in.(${states.join(',')})`;
      }
    }
    if (filters.service) params.business_service = `eq.${filters.service}`;
    if (filters.assignmentGroup) params.assignment_group = `eq.${filters.assignmentGroup}`;
    
    // PostgREST date filtering - use separate parameters with AND logic
    if (filters.dateFrom) {
      params['opened_at'] = `gte.${filters.dateFrom}`;
    }
    if (filters.dateTo) {
      params['opened_at'] = `lte.${filters.dateTo}`;
    }
    // When both are present, use the and parameter to combine conditions
    if (filters.dateFrom && filters.dateTo) {
      params['and'] = `(opened_at.gte.${filters.dateFrom},opened_at.lte.${filters.dateTo})`;
      delete params['opened_at']; // Remove individual param when using 'and'
    }
    
    const response = await instance.get("/servicenow_incidents", { params });
    return (response.data as ServiceNowIncident[]).map(mapServiceNowIncidentToTicket);
  },

  async getKPIs(filters: Filters): Promise<KPI> {
    try {
      const settings = getSettings();
      console.log('[API] getKPIs called with filters:', filters);
      console.log('[API] Settings:', { dataSource: settings.dataSource, apiBaseUrl: settings.apiBaseUrl });
      
      // Fetch all tickets to calculate KPIs
      const allTickets = await this.getAllTicketsForCalculation(filters);
      console.log('[API] Fetched tickets count:', allTickets.length);
      
      const total = allTickets.length;
      const open = allTickets.filter(t => t.status === 'Open').length;
      const resolved = allTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
      const slaCompliant = allTickets.filter(t => t.sla_met === true).length;
      const sla_compliance = total > 0 ? slaCompliant / total : 0;
    
    // Calculate MTTR (Mean Time To Resolution) in hours
    const resolvedTickets = allTickets.filter(t => t.resolved_at);
    let mttr_hours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        const opened = new Date(ticket.opened_at).getTime();
        const resolved = new Date(ticket.resolved_at!).getTime();
        return sum + (resolved - opened) / (1000 * 60 * 60);
      }, 0);
      mttr_hours = totalHours / resolvedTickets.length;
    }
    
    // Calculate backlog trend (last 7 days)
    const backlog: number[] = [];
    const backlog_dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      backlog_dates.push(dateStr);
      
      const count = allTickets.filter(t => {
        const openedAt = new Date(t.opened_at);
        return openedAt <= date && (t.status === 'Open' || t.status === 'In Progress');
      }).length;
      backlog.push(count);
    }
    
    return {
      total,
      open,
      resolved,
      sla_compliance,
      mttr_hours,
      backlog,
      backlog_dates,
    };
    } catch (error) {
      console.error('[API] Error in getKPIs:', error);
      throw error;
    }
  },

  async getKPITrends(filters: Filters): Promise<{ 
    current: KPI; 
    previous: KPI; 
    delta: Record<string, number> 
  }> {
    const hasCompleteDateRange = Boolean(filters.dateFrom && filters.dateTo);

    if (!hasCompleteDateRange) {
      const current = await this.getKPIs(filters);
      return {
        current,
        previous: current,
        delta: {}
      };
    }

    const currentFilters = { ...filters };

    const rangeEnd = new Date(filters.dateTo!);
    const rangeStart = new Date(filters.dateFrom!);

  const rangeDurationMs = rangeEnd.getTime() - rangeStart.getTime();
  const safeRangeDuration = Math.max(rangeDurationMs, 24 * 60 * 60 * 1000);
  const previousRangeEnd = new Date(rangeStart.getTime());
  const previousRangeStart = new Date(rangeStart.getTime() - safeRangeDuration);

    const previousFilters = {
      ...filters,
      dateFrom: previousRangeStart.toISOString(),
      dateTo: previousRangeEnd.toISOString(),
    };

    const [current, previous] = await Promise.all([
      this.getKPIs(currentFilters),
      this.getKPIs(previousFilters)
    ]);

    const calculateDelta = (currentValue: number, previousValue: number): number => {
      if (previousValue === 0) return currentValue > 0 ? 100 : 0;
      return ((currentValue - previousValue) / previousValue) * 100;
    };

    const delta = {
      total: calculateDelta(current.total, previous.total),
      open: calculateDelta(current.open, previous.open),
      resolved: calculateDelta(current.resolved, previous.resolved),
      sla_compliance: calculateDelta(current.sla_compliance * 100, previous.sla_compliance * 100),
      mttr_hours: calculateDelta(current.mttr_hours, previous.mttr_hours),
    };

    return { current, previous, delta };
  },

  async getTicketsTrend(filters: Filters): Promise<SeriesPoint[]> {
    // Fetch all tickets and group by date
    const allTickets = await this.getAllTicketsForCalculation(filters);
    
    // Group tickets by day
    const ticketsByDate = new Map<string, number>();
    allTickets.forEach(ticket => {
      const date = new Date(ticket.opened_at).toISOString().split('T')[0];
      ticketsByDate.set(date, (ticketsByDate.get(date) || 0) + 1);
    });
    
    // Convert to array and sort
    const trend: SeriesPoint[] = Array.from(ticketsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return trend;
  },

  async getBreakdown(groupBy: string, filters: Filters): Promise<Breakdown[]> {
    // Fetch all tickets and group by the specified field
    const allTickets = await this.getAllTicketsForCalculation(filters);
    
    const countMap = new Map<string, number>();
    allTickets.forEach(ticket => {
      let key = '';
      if (groupBy === 'priority') key = ticket.priority;
      else if (groupBy === 'category') key = ticket.category || 'Unknown';
      else if (groupBy === 'assignment_group') key = ticket.assignment_group || 'Unassigned';
      
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    
    const breakdown: Breakdown[] = Array.from(countMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    
    return breakdown;
  },

  async getTickets(filters: Filters, page = 1, pageSize = 20): Promise<TicketsResponse> {
    const settings = getSettings();

    // Supabase mode
    if (settings.dataSource === "supabase") {
      const supabase = await getSupabase();
      // Build query for servicenow_incidents
      let query = supabase.from("servicenow_incidents").select("*", { count: "exact" });

      // Apply filters - map from Ticket fields to ServiceNow fields
      if (filters.query) {
        query = query.ilike("short_description", `%${filters.query}%`);
      }
      if (filters.priority) {
        const priorityMap: Record<Priority, string> = { P1: "1", P2: "2", P3: "3", P4: "4" };
        const snPriority = priorityMap[filters.priority];
        if (snPriority) query = query.eq("priority", snPriority);
      }
      if (filters.ticketType && filters.ticketType !== "incident") {
        // Only incidents in this table, return empty if filtering for other types
        return { items: [], total: 0 };
      }
      if (filters.status) {
        const statusMap: Record<TicketStatus, string[]> = {
          Open: ["New"],
          "In Progress": ["In Progress", "On Hold"],
          Resolved: ["Resolved"],
          Closed: ["Closed", "Cancelled"],
        };
        const states = statusMap[filters.status];
        if (states && states.length === 1) {
          query = query.eq("state", states[0]);
        } else if (states && states.length > 1) {
          query = query.in("state", states);
        }
      }
      if (filters.service) {
        query = query.eq("business_service", filters.service);
      }
      if (filters.assignmentGroup) {
        query = query.eq("assignment_group", filters.assignmentGroup);
      }
      if (filters.dateFrom) {
        query = query.gte("opened_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("opened_at", filters.dateTo);
      }

      // Apply pagination
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1).order("opened_at", { ascending: false });

  const { data, error, count } = await query.returns<ServiceNowIncident[]>();

      if (error) {
        console.error("Error fetching tickets:", error);
        throw error;
      }

      // Map ServiceNow incidents to Ticket format
      const incidents = (data ?? []) as ServiceNowIncident[];
      const tickets = incidents.map((incident) => mapServiceNowIncidentToTicket(incident));

      return {
        items: tickets,
        total: count || 0,
      };
    }

    // Docker/PostgREST mode
    const instance = createAxiosInstance();
    
    // Build PostgREST query parameters for servicenow_incidents
  const params: Record<string, string | number> = {};
    if (filters.query) {
      params.short_description = `ilike.*${filters.query}*`;
    }
    if (filters.priority) {
      const priorityMap: Record<Priority, string> = { P1: "1", P2: "2", P3: "3", P4: "4" };
      const snPriority = priorityMap[filters.priority];
      if (snPriority) params.priority = `eq.${snPriority}`;
    }
    if (filters.ticketType && filters.ticketType !== "incident") {
      return { items: [], total: 0 };
    }
    if (filters.status) {
      const statusMap: Record<TicketStatus, string[]> = {
        Open: ["New"],
        "In Progress": ["In Progress", "On Hold"],
        Resolved: ["Resolved"],
        Closed: ["Closed", "Cancelled"],
      };
      const states = statusMap[filters.status];
      if (states && states.length === 1) {
        params.state = `eq.${states[0]}`;
      } else if (states && states.length > 1) {
        params.state = `in.(${states.join(',')})`;
      }
    }
    if (filters.service) {
      params.business_service = `eq.${filters.service}`;
    }
    if (filters.assignmentGroup) {
      params.assignment_group = `eq.${filters.assignmentGroup}`;
    }
    if (filters.dateFrom) {
      params.opened_at = `gte.${filters.dateFrom}`;
    }
    if (filters.dateTo && filters.dateFrom) {
      params.opened_at = `gte.${filters.dateFrom},lte.${filters.dateTo}`;
    } else if (filters.dateTo) {
      params.opened_at = `lte.${filters.dateTo}`;
    }

    // Apply pagination and ordering
    const start = (page - 1) * pageSize;
    params.order = "opened_at.desc";
    params.limit = pageSize;
    params.offset = start;

    const response = await instance.get("/servicenow_incidents", {
      params,
      headers: {
        'Prefer': 'count=exact',
      },
    });

    // PostgREST returns count in Content-Range header
    const contentRange = response.headers['content-range'];
    const total = contentRange ? parseInt(contentRange.split('/')[1]) : response.data.length;

    // Map ServiceNow incidents to Ticket format
    const tickets = (response.data as ServiceNowIncident[]).map(mapServiceNowIncidentToTicket);

    return {
      items: tickets,
      total,
    };
  },

  async getTopics(filters: Filters): Promise<NLPTopic[]> {
    // Topics require NLP analysis - return empty array for now
    // In production, this would call an ML service or use pre-computed topics
    return [];
  },

  async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
    const settings = getSettings();
    
    // If AI backend is not configured, return empty
    if (!settings.aiBackendUrl) {
      return [];
    }
    
    try {
      // Get all tickets
      const tickets = await this.getTickets(filters);
      
      // For each ticket, find similar ones
      const clusters: DuplicateCluster[] = [];
      const processed = new Set<string>();
      
      for (const ticket of tickets.items.slice(0, 10)) { // Limit to first 10 for performance
        if (processed.has(ticket.ticket_id)) continue;
        
        try {
          const result = await this.searchSimilarTickets({
            incident_number: ticket.ticket_id,
            top_k: 5,
            min_similarity: 0.85, // High threshold for duplicates
          });
          
          if (result.results.length > 0) {
            const ticketIds = [
              ticket.ticket_id,
              ...result.results.map(r => r.incident_number)
            ];
            
            clusters.push({
              cluster_id: `cluster-${ticket.ticket_id}`,
              ticket_ids: ticketIds,
              similarity_score: result.results[0]?.similarity_score || 0,
            });
            
            ticketIds.forEach(id => processed.add(id));
          }
        } catch (error) {
          console.error(`Failed to find similar tickets for ${ticket.ticket_id}:`, error);
        }
      }
      
      return clusters;
    } catch (error) {
      console.error("Failed to get duplicates:", error);
      return [];
    }
  },

  async getSummary(ticketIds: string[]): Promise<Summary> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.post("/llm/summary", { ticket_ids: ticketIds });
      return response.data;
    }
    // Default to mock data for now since summary isn't in Supabase yet
    const summary = {
      text: `Summary for ${ticketIds.length} ticket(s): These tickets primarily involve network connectivity and authentication issues. Common root causes include infrastructure overload and configuration mismatches. Recommended actions: upgrade network capacity, review authentication service logs, and implement additional monitoring.`,
    };
    return new Promise((resolve) => setTimeout(() => resolve(summary), 800));
  },

  async getGraphCandidates(options: {
    search?: string;
    relation?: "all" | "roots" | "children";
    priority?: Priority;
    status?: TicketStatus;
    limit?: number;
  } = {}): Promise<GraphCandidate[]> {
    const {
      search = "",
      relation = "all",
      priority,
      status,
      limit = 60,
    } = options;

    type RawChildIncidents = string[] | { value?: string[] | null } | null | undefined;
    type GraphCandidateSource = {
      incident_number: string;
      short_description?: string | null;
      state?: string | null;
      priority?: string | null;
      parent_incident?: string | null;
      child_incidents?: RawChildIncidents;
    };

    const extractChildIncidents = (input: RawChildIncidents): string[] => {
      if (Array.isArray(input)) return input;
      if (input && typeof input === "object" && "value" in input) {
        const value = (input as { value?: unknown }).value;
        return Array.isArray(value) ? value : [];
      }
      return [];
    };

    const normalize = (ticket: GraphCandidateSource): GraphCandidate => {
      const childArray = extractChildIncidents(ticket.child_incidents);

      return {
        incident_number: ticket.incident_number,
        short_description: ticket.short_description ?? null,
        state: ticket.state ?? null,
        priority: ticket.priority ?? null,
        parent_incident: ticket.parent_incident ?? null,
        child_incidents: childArray,
        child_count: childArray.length,
      };
    };

    const matchesSearch = (ticket: GraphCandidate) => {
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return (
        ticket.incident_number?.toLowerCase().includes(query) ||
        ticket.short_description?.toLowerCase().includes(query)
      );
    };

    const priorityMap: Record<Priority, string> = {
      P1: "1",
      P2: "2",
      P3: "3",
      P4: "4",
    };

    const stateMap: Record<TicketStatus, string[]> = {
      Open: ["New"],
      "In Progress": ["In Progress", "On Hold"],
      Resolved: ["Resolved"],
      Closed: ["Closed", "Cancelled"],
    };

    const matchesPriority = (ticket: GraphCandidate) => {
      if (!priority) return true;
      const snPriority = priorityMap[priority];
      return !snPriority || ticket.priority === snPriority;
    };

    const matchesStatus = (ticket: GraphCandidate) => {
      if (!status) return true;
      const states = stateMap[status];
      if (!states) return true;
      return states.includes(ticket.state ?? "");
    };

    const relationFilter = (ticket: GraphCandidate) => {
      const hasChildren = (ticket.child_count ?? 0) > 0;
      const hasParent = Boolean(ticket.parent_incident);
      if (relation === "roots") {
        return hasChildren && !hasParent;
      }
      if (relation === "children") {
        return hasParent;
      }
      return hasChildren || hasParent;
    };

    const applyClientFilters = (tickets: GraphCandidate[]) =>
      tickets
        .filter(relationFilter)
        .filter(matchesPriority)
        .filter(matchesStatus)
        .filter(matchesSearch)
        .sort((a, b) => b.child_count - a.child_count);

    const settings = getSettings();

    if (settings.dataSource === "supabase") {
      const supabase = await getSupabase();
      let query = supabase
        .from("servicenow_incidents")
        .select("incident_number,short_description,state,priority,parent_incident,child_incidents")
        .order("opened_at", { ascending: false })
        .limit(limit);

      if (relation === "roots") {
        query = query
          .not("child_incidents", "eq", "{}")
          .is("parent_incident", null);
      } else if (relation === "children") {
        query = query.not("parent_incident", "is", null);
      } else {
        query = query.or("child_incidents.neq.{},parent_incident.not.is.null");
      }

  const { data, error } = await query;
  if (error) throw error;
  const normalized = ((data ?? []) as unknown as GraphCandidateSource[]).map(normalize);
      return applyClientFilters(normalized);
    }

    const instance = createAxiosInstance();
    const queryParams: Record<string, string> = {
      select: "incident_number,short_description,state,priority,parent_incident,child_incidents",
      order: "opened_at.desc",
      limit: String(limit),
    };

    if (relation === "roots") {
      queryParams.and = "(child_incidents.not.eq.{},parent_incident.is.null)";
    } else if (relation === "children") {
      queryParams.parent_incident = "not.is.null";
    } else {
      queryParams.or = "(child_incidents.not.eq.{},parent_incident.not.is.null)";
    }

    const response = await instance.get("/servicenow_incidents", { params: queryParams });
  const rawTickets = Array.isArray(response.data) ? response.data : [];
  const normalized = (rawTickets as unknown as GraphCandidateSource[]).map(normalize);
    return applyClientFilters(normalized);
  },

  async getGraphLinks(ticketId: string): Promise<GraphData> {
    try {
      const family = await this.getTicketFamily(ticketId);
      if (!family?.ticket) {
        return { nodes: [], edges: [] };
      }

      const nodePriority: Record<string, number> = {
        root: 0,
        parent: 1,
        ancestor: 2,
        sibling: 3,
        child: 4,
        grandchild: 5,
      };

      const nodesMap = new Map<string, GraphData["nodes"][number]>();
      const edges: GraphData["edges"] = [];
      const edgeSet = new Set<string>();

      const setNode = (id: string, label: string, type: string) => {
        if (!id) return;
        const existing = nodesMap.get(id);
        if (!existing) {
          nodesMap.set(id, { id, label, type });
          return;
        }

        const existingPriority = nodePriority[existing.type] ?? Number.MAX_SAFE_INTEGER;
        const nextPriority = nodePriority[type] ?? Number.MAX_SAFE_INTEGER;
        if (nextPriority < existingPriority) {
          nodesMap.set(id, { id, label, type });
        }
      };

      const addEdge = (source?: string | null, target?: string | null, score?: number | null) => {
        if (!source || !target) return;
        const key = `${source}->${target}`;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ source, target, score: typeof score === "number" ? score : undefined });
      };

      // Root ticket
      const root = family.ticket;
      setNode(root.incident_number, root.incident_number, "root");

      // Helper to safely fetch ticket family, swallowing errors but logging for visibility
      const safeFetchFamily = async (incidentNumber: string) => {
        try {
          return await this.getTicketFamily(incidentNumber);
        } catch (err) {
          console.warn("[Graph] Failed to load extended family for", incidentNumber, err);
          return null;
        }
      };

      // Parent + siblings + ancestor
      if (family.parent) {
        const parent = family.parent;
        setNode(parent.incident_number, parent.incident_number, "parent");
        addEdge(parent.incident_number, root.incident_number, root.similarity_score ?? parent.similarity_score ?? undefined);

        const parentFamily = await safeFetchFamily(parent.incident_number);
        if (parentFamily) {
          if (parentFamily.parent) {
            const ancestor = parentFamily.parent;
            setNode(ancestor.incident_number, ancestor.incident_number, "ancestor");
            addEdge(ancestor.incident_number, parent.incident_number, ancestor.similarity_score ?? undefined);
          }

          parentFamily.children?.forEach((sibling) => {
            if (!sibling.incident_number) return;
            const type = sibling.incident_number === root.incident_number ? "root" : "sibling";
            setNode(sibling.incident_number, sibling.incident_number, type);
            if (sibling.incident_number !== root.incident_number) {
              addEdge(parent.incident_number, sibling.incident_number, sibling.similarity_score ?? undefined);
            }
          });
        }
      }

      // Children + grandchildren (limited to avoid explosion)
      const MAX_CHILDREN = 25;
      const children = family.children?.slice(0, MAX_CHILDREN) ?? [];

      const childFamilies = await Promise.all(
        children.map(async (child) => {
          if (!child.incident_number) return null;
          setNode(child.incident_number, child.incident_number, "child");
          addEdge(root.incident_number, child.incident_number, child.similarity_score ?? undefined);
          return safeFetchFamily(child.incident_number);
        })
      );

      childFamilies.forEach((childFamily, index) => {
        if (!childFamily) return;
        const parentChild = children[index];
        const grandChildren = childFamily.children ?? [];
        grandChildren.forEach((grandChild) => {
          if (!grandChild.incident_number) return;
          setNode(grandChild.incident_number, grandChild.incident_number, "grandchild");
          addEdge(parentChild.incident_number, grandChild.incident_number, grandChild.similarity_score ?? undefined);
        });
      });

      return {
        nodes: Array.from(nodesMap.values()),
        edges,
      };
    } catch (error) {
      console.error('Error fetching graph links:', error);
      return {
        nodes: [],
        edges: [],
      };
    }
  },

  // ========== AI Backend Methods (Python FastAPI) ==========
  
  /**
   * Health check for AI backend
   * Tests connection and authentication with Python FastAPI service
   */
  async healthCheckAI(): Promise<{ 
    status: string; 
    service: string; 
    version: string; 
    authenticated: boolean;
    user?: { id: number; email: string; role: string };
  }> {
    const settings = getSettings();
    const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
    const token = localStorage.getItem("auth-token");
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await axios.get(`${aiBackendUrl}/api/ai/health`, { headers });
    return response.data;
  },

  /**
   * Get detailed status from AI backend (requires authentication)
   */
  async getAIStatus(): Promise<{
    status: string;
    service: string;
    version: string;
    features: Record<string, string>;
    user: { id: number; email: string; role: string };
  }> {
    const settings = getSettings();
    const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
    const token = localStorage.getItem("auth-token");
    
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await axios.get(`${aiBackendUrl}/api/ai/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Search for similar tickets using semantic embeddings
   */
  async searchSimilarTickets(params: {
    incident_number?: string;
    short_description?: string;
    description?: string;
    top_k?: number;
    min_similarity?: number;
  }): Promise<SimilaritySearchResponse> {
    const settings = getSettings();
    const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
    const token = localStorage.getItem("auth-token");
    
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await axios.post(
      `${aiBackendUrl}/api/ai/similarity/search`,
      params,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  },

  /**
   * Get ticket family (parent + children)
   */
  async getTicketFamily(incident_number: string): Promise<TicketFamilyResponse> {
    const settings = getSettings();
    const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
    const token = localStorage.getItem("auth-token");
    
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await axios.get(
      `${aiBackendUrl}/api/ai/similarity/tickets/${incident_number}/family`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  },

  /**
   * Generate embedding for text (for preview/testing)
   */
  async generateEmbedding(data: EmbeddingRequest): Promise<EmbeddingResponse> {
    const settings = getSettings();
    const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
    const token = localStorage.getItem("auth-token");
    
    if (!token) {
      throw new Error("Authentication required");
    }
    
    const response = await axios.post(
      `${aiBackendUrl}/api/ai/similarity/embed`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return response.data;
  },

  // Future AI methods (Phase 2+):
  // async classifyTicket(text: string): Promise<ClassificationResult>
  // async analyzeSentiment(text: string): Promise<SentimentResult>
  // async searchKnowledgeBase(query: string): Promise<KBResult[]>
  // async askRAG(question: string): Promise<RAGAnswer>
};

