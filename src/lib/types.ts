export type TicketType = "incident" | "problem" | "change";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export interface Ticket {
  ticket_id: string;
  type: TicketType;
  category?: string;
  priority: Priority;
  status: TicketStatus;
  assignment_group?: string;
  service?: string;
  opened_at: string;
  resolved_at?: string;
  sla_met?: boolean;
  parent_id?: string | null;
  related_ticket_id?: string | null;
  short_desc: string;
  description?: string;
}

export interface KPI {
  total: number;
  open: number;
  resolved: number;
  sla_compliance: number;
  mttr_hours: number;
  backlog: number[];
  backlog_dates: string[];
}

export interface SeriesPoint {
  date: string;
  count: number;
}

export interface Breakdown {
  label: string;
  count: number;
}

export interface NLPTopic {
  topic: string;
  count: number;
  sample_ticket_ids: string[];
}

export interface DuplicateCluster {
  cluster_id: string;
  ticket_ids: string[];
}

export interface Summary {
  text: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  score?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TicketsResponse {
  items: Ticket[];
  total: number;
}

export interface Filters {
  dateFrom?: string;
  dateTo?: string;
  service?: string;
  priority?: Priority;
  assignmentGroup?: string;
  ticketType?: TicketType;
  status?: TicketStatus;
  query?: string;
}

export interface Settings {
  apiBaseUrl: string;
  authToken: string;
  dataSource: "docker" | "supabase";
}
