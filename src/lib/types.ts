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

// ServiceNow Incident interface (from servicenow_incidents table)
export interface ServiceNowIncident {
  id: string;
  incident_number: string | null;
  sys_id: string | null;
  short_description: string;
  description: string | null;
  caller_id: string | null;
  assigned_to: string | null;
  assignment_group: string | null;
  category: string | null;
  subcategory: string | null;
  impact: string | null;
  urgency: string | null;
  priority: string | null;
  state: string | null;
  work_notes: string | null;
  comments_and_work_notes: string | null;
  close_code: string | null;
  close_notes: string | null;
  resolution_code: string | null;
  resolution_notes: string | null;
  opened_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sys_created_on: string;
  sys_updated_on: string;
  sys_created_by: string | null;
  sys_updated_by: string | null;
  sys_mod_count: number | null;
  business_service: string | null;
  cmdb_ci: string | null;
  legacy_ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

// Mapper function to convert ServiceNow incident to Ticket format
export function mapServiceNowIncidentToTicket(incident: ServiceNowIncident): Ticket {
  // Map ServiceNow state to Ticket status
  const mapState = (state: string | null): TicketStatus => {
    switch (state) {
      case "New":
        return "Open";
      case "In Progress":
        return "In Progress";
      case "On Hold":
        return "In Progress";
      case "Resolved":
        return "Resolved";
      case "Closed":
        return "Closed";
      case "Cancelled":
        return "Closed";
      default:
        return "Open";
    }
  };

  // Map ServiceNow priority (1-5) to Ticket priority (P1-P4)
  const mapPriority = (priority: string | null): Priority => {
    switch (priority) {
      case "1": // Critical
        return "P1";
      case "2": // High
        return "P2";
      case "3": // Moderate
        return "P3";
      case "4": // Low
      case "5": // Planning
        return "P4";
      default:
        return "P3";
    }
  };

  // Calculate SLA met based on resolved/closed state
  const calculateSLAMet = (incident: ServiceNowIncident): boolean | undefined => {
    if (!incident.resolved_at && !incident.closed_at) {
      return undefined; // Not yet resolved
    }
    // Simple heuristic: if resolved/closed, assume SLA met (you can add more logic)
    return true;
  };

  return {
    ticket_id: incident.incident_number || incident.id,
    type: "incident", // All ServiceNow incidents are type "incident"
    category: incident.category || undefined,
    priority: mapPriority(incident.priority),
    status: mapState(incident.state),
    assignment_group: incident.assignment_group || undefined,
    service: incident.business_service || undefined,
    opened_at: incident.opened_at || incident.created_at,
    resolved_at: incident.resolved_at || undefined,
    sla_met: calculateSLAMet(incident),
    parent_id: null,
    related_ticket_id: null,
    short_desc: incident.short_description,
    description: incident.description || undefined,
  };
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
  similarity_score?: number;
}

export interface Summary {
  text: string;
}

// Similarity search types
export interface SimilarTicket {
  incident_number: string;
  short_description: string | null;
  description: string | null;
  state: string | null;
  priority: string | null;
  opened_at: string | null;
  similarity_score: number; // 0.0 to 1.0
  already_has_parent: boolean;
}

export interface SimilaritySearchResponse {
  model_name: string;
  embedding_dimension: number;
  query_incident: string | null;
  generated_embedding: boolean;
  results: SimilarTicket[];
}

// Ticket family types
export interface TicketSummary {
  incident_number: string;
  short_description: string | null;
  description: string | null;
  state: string | null;
  priority: string | null;
  opened_at: string | null;
  parent_incident: string | null;
  child_incidents: string[] | null;
  similarity_score: number | null;
}

export interface TicketFamilyResponse {
  ticket: TicketSummary;
  parent: TicketSummary | null;
  children: TicketSummary[];
  total_children: number;
}

// Embedding request/response
export interface EmbeddingRequest {
  short_description: string;
  description?: string;
}

export interface EmbeddingResponse {
  model_name: string;
  embedding_dimension: number;
  embedding: number[];
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

export interface GraphCandidate {
  incident_number: string;
  short_description: string | null;
  state: string | null;
  priority: string | null;
  parent_incident: string | null;
  child_incidents: string[] | null;
  child_count: number;
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
  aiBackendUrl?: string;
  aiEnabled?: boolean;
  similarityEnabled?: boolean;
  similarityThreshold?: number;
  similarityTopK?: number;
  autoDetectDuplicates?: boolean;
}

export interface UserPreferences {
  // Appearance
  theme: "light" | "dark" | "system";
  
  // Navigation
  defaultPage: "dashboard" | "tickets" | "insights" | "graph";
  
  // Table Settings
  ticketsPerPage: 10 | 25 | 50 | 100;
  defaultSortBy: "opened_at" | "priority" | "status";
  defaultSortOrder: "asc" | "desc";
  
  // Date & Time
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  
  // AI Features
  enableSimilarTickets: boolean;
  enableDuplicateDetection: boolean;
  enableAutoClassification: boolean;
  similarityThreshold: number; // 0.5 to 0.95
  
  // Default Filters
  defaultStatus?: TicketStatus[];
  defaultPriority?: Priority[];
  defaultDateRange?: string; // "7d", "30d", "90d", "all"
  favoriteAssignmentGroups?: string[];
  
  // Notifications
  enableNotifications: boolean;
  notifyOnAssignment: boolean;
  notifyOnStatusChange: boolean;
  notifyOnSLABreach: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultPage: "dashboard",
  ticketsPerPage: 25,
  defaultSortBy: "opened_at",
  defaultSortOrder: "desc",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  enableSimilarTickets: true,
  enableDuplicateDetection: true,
  enableAutoClassification: false,
  similarityThreshold: 0.75,
  defaultDateRange: "30d",
  enableNotifications: true,
  notifyOnAssignment: true,
  notifyOnStatusChange: false,
  notifyOnSLABreach: true,
};
