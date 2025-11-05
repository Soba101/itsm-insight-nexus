import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <CardTitle>Duplicate Clusters</CardTitle>
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
