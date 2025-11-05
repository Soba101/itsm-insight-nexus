import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraphData } from "@/lib/types";
import cytoscape from "cytoscape";

interface GraphViewerProps {
  data?: GraphData;
}

export function GraphViewer({ data }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data || !data.nodes || !data.nodes.length) return;

    const elements = [
      ...data.nodes.map((node) => ({
        data: { id: node.id, label: node.label, type: node.type },
      })),
      ...data.edges.map((edge) => ({
        data: { source: edge.source, target: edge.target, score: edge.score },
      })),
    ];

    const getNodeColor = (type: string) => {
      switch (type) {
        case "incident": return "hsl(var(--chart-1))";
        case "problem": return "hsl(var(--chart-2))";
        case "change": return "hsl(var(--chart-3))";
        default: return "hsl(var(--muted))";
      }
    };

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => getNodeColor(ele.data("type")),
            label: "data(label)",
            color: "hsl(var(--foreground))",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
            width: 60,
            height: 60,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "hsl(var(--border))",
            "target-arrow-color": "hsl(var(--border))",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 500,
      },
    });

    return () => {
      cyRef.current?.destroy();
    };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Relationship Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="w-full h-[500px] rounded-lg border bg-background"
        />
      </CardContent>
    </Card>
  );
}
