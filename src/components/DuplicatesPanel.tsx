import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { DuplicateCluster } from "@/lib/types";

interface DuplicatesPanelProps {
  clusters?: DuplicateCluster[];
}

export function DuplicatesPanel({ clusters }: DuplicatesPanelProps) {
  if (!clusters || clusters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No duplicate clusters found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Duplicate Clusters</CardTitle>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" side="top">
                <p className="font-semibold mb-1">Potential Duplicate Tickets</p>
                <p className="text-xs">
                  • Groups tickets with high content similarity (&gt;85%){"\n"}
                  • Identifies potentially related or duplicate work{"\n"}
                  • Consolidating duplicates improves efficiency{"\n"}
                  • Review clusters to merge related tickets{"\n"}
                  • Reduces redundant work and confusion{"\n"}
                  • Helps identify recurring systemic issues
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clusters.map((cluster) => (
            <div
              key={cluster.cluster_id}
              className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{cluster.cluster_id}</p>
                <Badge variant="outline">{cluster.ticket_ids.length} tickets</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {cluster.ticket_ids.map((id) => (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
