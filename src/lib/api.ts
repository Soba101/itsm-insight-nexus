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
} from "./types";
import { mockKPI, mockTrendData, mockPriorityBreakdown, mockCategoryBreakdown, mockAssignmentBreakdown } from "./mocks/kpis";
import { mockTickets } from "./mocks/tickets";
import { mockTopics, mockDuplicateClusters, mockGraphData } from "./mocks/insights";
import { supabase } from "@/integrations/supabase/client";

const getSettings = () => {
  const stored = localStorage.getItem("itsm-settings");
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    apiBaseUrl: "",
    authToken: "",
    dataSource: "supabase" as "docker" | "supabase",
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
  async getKPIs(filters: Filters): Promise<KPI> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/kpis", { params: filters });
      return response.data;
    }
    // Default to mock data for now since KPIs aren't in Supabase yet
    return new Promise((resolve) => setTimeout(() => resolve(mockKPI), 300));
  },

  async getTicketsTrend(filters: Filters): Promise<SeriesPoint[]> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/tickets/trend", {
        params: { interval: "day", ...filters },
      });
      return response.data;
    }
    // Default to mock data for now since trends aren't in Supabase yet
    return new Promise((resolve) => setTimeout(() => resolve(mockTrendData), 300));
  },

  async getBreakdown(groupBy: string, filters: Filters): Promise<Breakdown[]> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/tickets/breakdown", {
        params: { group_by: groupBy, ...filters },
      });
      return response.data;
    }
    // Default to mock data for now since breakdowns aren't in Supabase yet
    let data: Breakdown[] = [];
    if (groupBy === "priority") data = mockPriorityBreakdown;
    else if (groupBy === "category") data = mockCategoryBreakdown;
    else if (groupBy === "assignment_group") data = mockAssignmentBreakdown;
    return new Promise((resolve) => setTimeout(() => resolve(data), 300));
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

    // Docker/Custom API mode
    const instance = createAxiosInstance();
    const response = await instance.get("/tickets", {
      params: { ...filters, page, pageSize },
    });
    return response.data;
  },

  async getTopics(filters: Filters): Promise<NLPTopic[]> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/nlp/topics", { params: filters });
      return response.data;
    }
    // Default to mock data for now since topics aren't in Supabase yet
    return new Promise((resolve) => setTimeout(() => resolve(mockTopics), 300));
  },

  async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/nlp/duplicates", { params: filters });
      return response.data;
    }
    // Default to mock data for now since duplicates aren't in Supabase yet
    return new Promise((resolve) =>
      setTimeout(() => resolve(mockDuplicateClusters), 300)
    );
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
    const settings = getSettings();
    if (settings.dataSource === "docker") {
      const instance = createAxiosInstance();
      const response = await instance.get("/graph/links", { params: { ticket_id: ticketId } });
      return response.data;
    }
    // Default to mock data for now since graph links aren't in Supabase yet
    return new Promise((resolve) => setTimeout(() => resolve(mockGraphData), 300));
  },
};
