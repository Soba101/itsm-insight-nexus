import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Users, ArrowUp, ArrowDown } from "lucide-react";

interface TicketFamilyCardProps {
  incidentNumber: string;
  onTicketClick?: (incidentNumber: string) => void;
}

export function TicketFamilyCard({ incidentNumber, onTicketClick }: TicketFamilyCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["ticket-family", incidentNumber],
    queryFn: () => api.getTicketFamily(incidentNumber),
    enabled: !!incidentNumber,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Family</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasFamily = data?.parent || (data?.children && data.children.length > 0);

  if (!hasFamily) {
    return null; // Don't show if no family
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ticket Family
          </CardTitle>
          {data?.total_children > 0 && (
            <Badge variant="secondary">{data.total_children} related</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent */}
        {data?.parent && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <ArrowUp className="h-4 w-4" />
              Parent Ticket
            </div>
            <div 
              className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onTicketClick?.(data.parent?.incident_number || "")}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline">{data.parent.incident_number}</Badge>
                {data.parent.similarity_score && (
                  <span className="text-xs text-muted-foreground">
                    {(data.parent.similarity_score * 100).toFixed(0)}% similar
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-2">
                {data.parent.short_description || "No description"}
              </p>
            </div>
          </div>
        )}

        {/* Children */}
        {data?.children && data.children.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
              Child Tickets ({data.children.length})
            </div>
            <div className="space-y-2">
              {data.children.map((child) => (
                <div 
                  key={child.incident_number} 
                  className="p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onTicketClick?.(child.incident_number)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {child.incident_number}
                    </Badge>
                    {child.similarity_score && (
                      <span className="text-xs text-muted-foreground">
                        {(child.similarity_score * 100).toFixed(0)}% similar
                      </span>
                    )}
                  </div>
                  <p className="text-xs line-clamp-1 text-muted-foreground">
                    {child.short_description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
