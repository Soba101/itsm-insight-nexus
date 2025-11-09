import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { Breakdown } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

interface BreakdownCardProps {
  priorityData: Breakdown[];
  categoryData: Breakdown[];
  assignmentData: Breakdown[];
}

export function BreakdownCard({ priorityData, categoryData, assignmentData }: BreakdownCardProps) {
  const [activeTab, setActiveTab] = useState("priority");

  // Sort priority data P1->P4 for proper display order
  const sortedPriorityData = [...priorityData].sort((a, b) => {
    const priorityOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    return (priorityOrder[a.label] || 999) - (priorityOrder[b.label] || 999);
  });

  const formatLabel = (label: string) => {
    if (!label) return label;

    // Special case for "Problem Analyzers" to prevent bad splitting
    if (label === "Problem Analyzers") {
      return "Problem\nAnalyzers";
    }

    if (label.includes("/")) {
      const parts = label.split("/").map((part) => part.trim());
      return parts.join("\n");
    }

    if (label.includes(" ")) {
      const words = label.split(" ");
      if (words.length === 2) {
        return words.join("\n");
      }
      // For 3+ words, split more intelligently
      if (words.length === 3) {
        return `${words[0]} ${words[1]}\n${words[2]}`;
      }
      const midpoint = Math.ceil(words.length / 2);
      const firstLine = words.slice(0, midpoint).join(" ");
      const secondLine = words.slice(midpoint).join(" ");
      return `${firstLine}\n${secondLine}`;
    }

    const maxLength = 20;
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
  };

  const getTooltipContent = () => {
    switch (activeTab) {
      case "priority":
        return (
          <>
            <p className="font-semibold mb-1">Priority Distribution</p>
            <p className="text-xs">
              • P1 (Critical): System down, major business impact{"\n"}
              • P2 (High): Significant functionality affected{"\n"}
              • P3 (Medium): Minor issue, workaround available{"\n"}
              • P4 (Low): Enhancement or minor inconvenience{"\n"}
              • Balance workload across priorities
            </p>
          </>
        );
      case "category":
        return (
          <>
            <p className="font-semibold mb-1">Category Breakdown</p>
            <p className="text-xs">
              • Groups tickets by issue type or service area{"\n"}
              • Identifies most common problem domains{"\n"}
              • Helps allocate specialist resources{"\n"}
              • High categories may need process improvement{"\n"}
              • Use for knowledge base prioritization
            </p>
          </>
        );
      case "assignment":
        return (
          <>
            <p className="font-semibold mb-1">Assignment Group Distribution</p>
            <p className="text-xs">
              • Shows ticket allocation across support teams{"\n"}
              • Helps identify overloaded or underutilized teams{"\n"}
              • Balance workload for optimal efficiency{"\n"}
              • High counts may indicate bottlenecks{"\n"}
              • Consider cross-training or resource reallocation
            </p>
          </>
        );
      default:
        return null;
    }
  };

  const renderChart = (data: Breakdown[]) => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, bottom: 10, left: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={120}
              tickFormatter={formatLabel}
              tickLine={false}
              interval={0}
            />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="count" position="right" fill="hsl(var(--foreground))" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ticket Breakdown</CardTitle>
          <TooltipProvider delayDuration={200}>
            <InfoTooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" side="top">
                {getTooltipContent()}
              </TooltipContent>
            </InfoTooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="priority">Priority</TabsTrigger>
            <TabsTrigger value="category">Category</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
          </TabsList>
          <TabsContent value="priority" className="mt-4">
            {renderChart(sortedPriorityData)}
          </TabsContent>
          <TabsContent value="category" className="mt-4">
            {renderChart(categoryData)}
          </TabsContent>
          <TabsContent value="assignment" className="mt-4">
            {renderChart(assignmentData)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
