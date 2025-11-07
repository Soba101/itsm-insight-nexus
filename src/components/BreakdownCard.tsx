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

  const renderChart = (data: Breakdown[]) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
          <LabelList dataKey="count" position="right" fill="hsl(var(--foreground))" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

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
            {renderChart(priorityData)}
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
