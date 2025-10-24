import { KPI, SeriesPoint, Breakdown } from "../types";

export const mockKPI: KPI = {
  total: 847,
  open: 145,
  resolved: 623,
  sla_compliance: 0.87,
  mttr_hours: 4.2,
  backlog: [120, 135, 142, 138, 145, 148, 145],
  backlog_dates: [
    "2025-10-18",
    "2025-10-19",
    "2025-10-20",
    "2025-10-21",
    "2025-10-22",
    "2025-10-23",
    "2025-10-24",
  ],
};

export const mockTrendData: SeriesPoint[] = [
  { date: "2025-10-01", count: 42 },
  { date: "2025-10-02", count: 38 },
  { date: "2025-10-03", count: 45 },
  { date: "2025-10-04", count: 52 },
  { date: "2025-10-05", count: 48 },
  { date: "2025-10-06", count: 35 },
  { date: "2025-10-07", count: 31 },
  { date: "2025-10-08", count: 44 },
  { date: "2025-10-09", count: 49 },
  { date: "2025-10-10", count: 53 },
  { date: "2025-10-11", count: 47 },
  { date: "2025-10-12", count: 41 },
  { date: "2025-10-13", count: 36 },
  { date: "2025-10-14", count: 33 },
  { date: "2025-10-15", count: 46 },
  { date: "2025-10-16", count: 51 },
  { date: "2025-10-17", count: 55 },
  { date: "2025-10-18", count: 49 },
  { date: "2025-10-19", count: 44 },
  { date: "2025-10-20", count: 37 },
  { date: "2025-10-21", count: 34 },
  { date: "2025-10-22", count: 48 },
  { date: "2025-10-23", count: 52 },
  { date: "2025-10-24", count: 45 },
];

export const mockPriorityBreakdown: Breakdown[] = [
  { label: "P1", count: 45 },
  { label: "P2", count: 123 },
  { label: "P3", count: 289 },
  { label: "P4", count: 390 },
];

export const mockCategoryBreakdown: Breakdown[] = [
  { label: "Network", count: 185 },
  { label: "Application", count: 267 },
  { label: "Hardware", count: 142 },
  { label: "Security", count: 98 },
  { label: "Performance", count: 155 },
];

export const mockAssignmentBreakdown: Breakdown[] = [
  { label: "Network Operations", count: 198 },
  { label: "Application Support", count: 245 },
  { label: "Infrastructure", count: 167 },
  { label: "Security Operations", count: 89 },
  { label: "Performance Engineering", count: 148 },
];
