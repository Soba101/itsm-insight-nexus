import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breakdown } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BreakdownCardProps {
  priorityData: Breakdown[];
  categoryData: Breakdown[];
  assignmentData: Breakdown[];
}

export function BreakdownCard({ priorityData, categoryData, assignmentData }: BreakdownCardProps) {
  const [activeTab, setActiveTab] = useState("priority");

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
        <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Breakdown</CardTitle>
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
