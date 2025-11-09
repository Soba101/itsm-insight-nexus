import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraphData } from "@/lib/types";
import cytoscape, { Core, NodeSingular } from "cytoscape";

interface GraphViewerProps {
  data?: GraphData;
}

export function GraphViewer({ data }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || !data.nodes || !data.nodes.length) {
      cyRef.current?.destroy();
      cyRef.current = null;
      return;
    }

    const nodeColors: Record<string, string> = {
      root: "#2563eb",
      parent: "#7c3aed",
      ancestor: "#4c1d95",
      sibling: "#f97316",
      child: "#0ea5e9",
      grandchild: "#10b981",
      default: "#94a3b8",
    };

    const elements = [
      ...data.nodes.map((node) => ({
        data: { id: node.id, label: node.label, type: node.type },
      })),
      ...data.edges.map((edge) => ({
        data: { source: edge.source, target: edge.target, score: edge.score },
      })),
    ];

    cyRef.current?.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: NodeSingular) => {
              const type = ele.data("type") as GraphData["nodes"][number]["type"];
              return nodeColors[type] ?? nodeColors.default;
            },
            label: "data(label)",
            color: "#0f172a",
            "text-outline-color": "#ffffff",
            "text-outline-width": 1,
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "11px",
            width: 52,
            height: 52,
            "border-width": 2,
            "border-color": "#e2e8f0",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: (ele) => {
              const score = ele.data("score");
              return typeof score === "number" ? `${Math.round(score * 100)}%` : "";
            },
            "font-size": "9px",
            "text-background-color": "rgba(255,255,255,0.85)",
            "text-background-opacity": 1,
            "text-background-padding": "2px",
            color: "#475569",
          },
        },
      ],
      layout: {
        name: "concentric",
        padding: 40,
        startAngle: Math.PI / 2,
        sweep: Math.PI * 2,
        equidistant: true,
        concentric: (node: NodeSingular) => {
          const type = node.data("type") as string;
          switch (type) {
            case "root":
              return 6;
            case "parent":
            case "ancestor":
              return 5;
            case "sibling":
              return 4;
            case "child":
              return 3;
            case "grandchild":
              return 2;
            default:
              return 1;
          }
        },
        levelWidth: () => 1,
        animate: true,
        animationDuration: 500,
      },
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cyRef.current.ready(() => {
      cyRef.current?.resize();
      cyRef.current?.fit();
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  const hasData = data && data.nodes && data.nodes.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Relationship Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative w-full h-[500px] rounded-lg border bg-background"
        >
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center px-8">
                No relationships found for this ticket. The ticket may not have any parent or child incidents.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
