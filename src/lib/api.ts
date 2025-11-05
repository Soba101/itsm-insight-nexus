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
  Filters,
  Ticket,
} from "./types";
import { supabase } from "@/integrations/supabase/client";

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
      let query = supabase.from("tickets").select("*");
      
      if (filters.query) query = query.ilike("short_desc", `%${filters.query}%`);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.ticketType) query = query.eq("type", filters.ticketType);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.service) query = query.eq("service", filters.service);
      if (filters.assignmentGroup) query = query.eq("assignment_group", filters.assignmentGroup);
      if (filters.dateFrom) query = query.gte("opened_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("opened_at", filters.dateTo);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ticket[];
    }
    
    // Docker/PostgREST mode - fetch all tickets
    const instance = createAxiosInstance();
    const params: any = { limit: 1000 }; // Get up to 1000 tickets for calculation
    
    if (filters.query) params.short_desc = `ilike.*${filters.query}*`;
    if (filters.priority) params.priority = `eq.${filters.priority}`;
    if (filters.ticketType) params.type = `eq.${filters.ticketType}`;
    if (filters.status) params.status = `eq.${filters.status}`;
    if (filters.service) params.service = `eq.${filters.service}`;
    if (filters.assignmentGroup) params.assignment_group = `eq.${filters.assignmentGroup}`;
    if (filters.dateFrom && filters.dateTo) {
      params.opened_at = `gte.${filters.dateFrom},lte.${filters.dateTo}`;
    } else if (filters.dateFrom) {
      params.opened_at = `gte.${filters.dateFrom}`;
    } else if (filters.dateTo) {
      params.opened_at = `lte.${filters.dateTo}`;
    }
    
    const response = await instance.get("/tickets", { params });
    return response.data as Ticket[];
  },

  async getKPIs(filters: Filters): Promise<KPI> {
    const settings = getSettings();
    
    // Fetch all tickets to calculate KPIs
    const allTickets = await this.getAllTicketsForCalculation(filters);
    
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
      // Build query
      let query = supabase.from("tickets").select("*", { count: "exact" });

      // Apply filters
      if (filters.query) {
        query = query.ilike("short_desc", `%${filters.query}%`);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.ticketType) {
        query = query.eq("type", filters.ticketType);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.service) {
        query = query.eq("service", filters.service);
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

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
        throw error;
      }

      return {
        items: (data || []) as any,
        total: count || 0,
      };
    }

    // Docker/PostgREST mode
    const instance = createAxiosInstance();
    
    // Build PostgREST query parameters
    const params: any = {};
    if (filters.query) {
      params.short_desc = `ilike.*${filters.query}*`;
    }
    if (filters.priority) {
      params.priority = `eq.${filters.priority}`;
    }
    if (filters.ticketType) {
      params.type = `eq.${filters.ticketType}`;
    }
    if (filters.status) {
      params.status = `eq.${filters.status}`;
    }
    if (filters.service) {
      params.service = `eq.${filters.service}`;
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

    const response = await instance.get("/tickets", {
      params,
      headers: {
        'Prefer': 'count=exact',
      },
    });

    // PostgREST returns count in Content-Range header
    const contentRange = response.headers['content-range'];
    const total = contentRange ? parseInt(contentRange.split('/')[1]) : response.data.length;

    return {
      items: response.data,
      total,
    };
  },

  async getTopics(filters: Filters): Promise<NLPTopic[]> {
    // Topics require NLP analysis - return empty array for now
    // In production, this would call an ML service or use pre-computed topics
    return [];
  },

  async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
    // Duplicates require similarity analysis - return empty array for now
    // In production, this would call an ML service or use pre-computed clusters
    return [];
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

  async getGraphLinks(ticketId: string): Promise<GraphData> {
    // Graph links require relationship analysis
    // For now, return empty graph
    return {
      nodes: [],
      edges: [],
    };
  },
};
