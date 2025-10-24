import { NLPTopic, DuplicateCluster, GraphData } from "../types";

export const mockTopics: NLPTopic[] = [
  {
    topic: "Network Connectivity Issues",
    count: 87,
    sample_ticket_ids: ["INC0001234", "INC0001239", "INC0001245"],
  },
  {
    topic: "Authentication & Login Problems",
    count: 64,
    sample_ticket_ids: ["INC0001235", "INC0001248", "INC0001252"],
  },
  {
    topic: "Performance Degradation",
    count: 52,
    sample_ticket_ids: ["PRB0000123", "INC0001241", "INC0001256"],
  },
  {
    topic: "Disk Space & Storage",
    count: 41,
    sample_ticket_ids: ["INC0001236", "INC0001243", "INC0001249"],
  },
  {
    topic: "Security Alerts",
    count: 38,
    sample_ticket_ids: ["INC0001237", "INC0001244", "INC0001251"],
  },
  {
    topic: "Application Errors",
    count: 35,
    sample_ticket_ids: ["INC0001242", "INC0001246", "INC0001253"],
  },
];

export const mockDuplicateClusters: DuplicateCluster[] = [
  {
    cluster_id: "CLUSTER_001",
    ticket_ids: ["INC0001234", "INC0001239", "INC0001245"],
  },
  {
    cluster_id: "CLUSTER_002",
    ticket_ids: ["INC0001235", "INC0001248"],
  },
  {
    cluster_id: "CLUSTER_003",
    ticket_ids: ["INC0001236", "INC0001243", "INC0001249", "INC0001254"],
  },
];

export const mockGraphData: GraphData = {
  nodes: [
    { id: "INC0001234", label: "Network Outage", type: "incident" },
    { id: "INC0001235", label: "Login Failures", type: "incident" },
    { id: "PRB0000123", label: "DB Slowdowns", type: "problem" },
    { id: "CHG0000456", label: "LB Upgrade", type: "change" },
    { id: "INC0001237", label: "Security Breach", type: "incident" },
    { id: "INC0001239", label: "VPN Issues", type: "incident" },
  ],
  edges: [
    { source: "INC0001235", target: "PRB0000123", score: 0.85 },
    { source: "INC0001234", target: "INC0001239", score: 0.72 },
    { source: "PRB0000123", target: "CHG0000456", score: 0.65 },
    { source: "INC0001237", target: "CHG0000456", score: 0.55 },
  ],
};
