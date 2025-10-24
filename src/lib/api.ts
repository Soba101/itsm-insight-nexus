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

const getSettings = () => {
  const stored = localStorage.getItem("itsm-settings");
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    apiBaseUrl: "",
    authToken: "",
    useMockData: true,
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
    if (settings.useMockData) {
      return new Promise((resolve) => setTimeout(() => resolve(mockKPI), 300));
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/kpis", { params: filters });
    return response.data;
  },

  async getTicketsTrend(filters: Filters): Promise<SeriesPoint[]> {
    const settings = getSettings();
    if (settings.useMockData) {
      return new Promise((resolve) => setTimeout(() => resolve(mockTrendData), 300));
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/tickets/trend", {
      params: { interval: "day", ...filters },
    });
    return response.data;
  },

  async getBreakdown(groupBy: string, filters: Filters): Promise<Breakdown[]> {
    const settings = getSettings();
    if (settings.useMockData) {
      let data: Breakdown[] = [];
      if (groupBy === "priority") data = mockPriorityBreakdown;
      else if (groupBy === "category") data = mockCategoryBreakdown;
      else if (groupBy === "assignment_group") data = mockAssignmentBreakdown;
      return new Promise((resolve) => setTimeout(() => resolve(data), 300));
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/tickets/breakdown", {
      params: { group_by: groupBy, ...filters },
    });
    return response.data;
  },

  async getTickets(filters: Filters, page = 1, pageSize = 20): Promise<TicketsResponse> {
    const settings = getSettings();
    if (settings.useMockData) {
      const filtered = mockTickets.filter((t) => {
        if (filters.query && !t.short_desc.toLowerCase().includes(filters.query.toLowerCase())) {
          return false;
        }
        if (filters.priority && t.priority !== filters.priority) return false;
        if (filters.ticketType && t.type !== filters.ticketType) return false;
        if (filters.status && t.status !== filters.status) return false;
        if (filters.service && t.service !== filters.service) return false;
        if (filters.assignmentGroup && t.assignment_group !== filters.assignmentGroup) return false;
        return true;
      });
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return new Promise((resolve) =>
        setTimeout(() => resolve({ items, total: filtered.length }), 300)
      );
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/tickets", {
      params: { ...filters, page, page_size: pageSize },
    });
    return response.data;
  },

  async getTopics(filters: Filters): Promise<NLPTopic[]> {
    const settings = getSettings();
    if (settings.useMockData) {
      return new Promise((resolve) => setTimeout(() => resolve(mockTopics), 300));
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/nlp/topics", { params: filters });
    return response.data;
  },

  async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
    const settings = getSettings();
    if (settings.useMockData) {
      return new Promise((resolve) =>
        setTimeout(() => resolve(mockDuplicateClusters), 300)
      );
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/nlp/duplicates", { params: filters });
    return response.data;
  },

  async getSummary(ticketIds: string[]): Promise<Summary> {
    const settings = getSettings();
    if (settings.useMockData) {
      const summary = {
        text: `Summary for ${ticketIds.length} ticket(s): These tickets primarily involve network connectivity and authentication issues. Common root causes include infrastructure overload and configuration mismatches. Recommended actions: upgrade network capacity, review authentication service logs, and implement additional monitoring.`,
      };
      return new Promise((resolve) => setTimeout(() => resolve(summary), 800));
    }
    const instance = createAxiosInstance();
    const response = await instance.post("/llm/summary", { ticket_ids: ticketIds });
    return response.data;
  },

  async getGraphLinks(ticketId: string): Promise<GraphData> {
    const settings = getSettings();
    if (settings.useMockData) {
      return new Promise((resolve) => setTimeout(() => resolve(mockGraphData), 300));
    }
    const instance = createAxiosInstance();
    const response = await instance.get("/graph/links", { params: { ticket_id: ticketId } });
    return response.data;
  },
};
