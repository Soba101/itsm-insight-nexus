import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Link2, AlertTriangle } from "lucide-react";

interface SimilarTicketsCardProps {
  incidentNumber: string;
  minSimilarity?: number;
  topK?: number;
  onTicketClick?: (incidentNumber: string) => void;
}

export function SimilarTicketsCard({ 
  incidentNumber, 
  minSimilarity = 0.7,
  topK = 5,
  onTicketClick,
}: SimilarTicketsCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["similar-tickets", incidentNumber, minSimilarity, topK],
    queryFn: () => api.searchSimilarTickets({
      incident_number: incidentNumber,
      top_k: topK,
      min_similarity: minSimilarity,
    }),
    enabled: !!incidentNumber,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-destructive">Failed to load similar tickets</p>
            <p className="text-xs text-muted-foreground">
              Make sure the AI backend is running and the Python backend container has been restarted
              to apply recent fixes. Try restarting Docker containers with: docker-compose restart
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const results = data?.results || [];
  const hasPotentialDuplicates = results.some(r => r.similarity_score >= 0.85);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Similar Tickets</CardTitle>
          {hasPotentialDuplicates && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Potential Duplicates
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No similar tickets found
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((ticket) => (
              <div
                key={ticket.incident_number}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (onTicketClick) {
                    onTicketClick(ticket.incident_number);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ticket.incident_number}</Badge>
                    {ticket.already_has_parent && (
                      <Badge variant="secondary" className="gap-1">
                        <Link2 className="h-3 w-3" />
                        Linked
                      </Badge>
                    )}
                  </div>
                  <Badge 
                    variant={ticket.similarity_score >= 0.85 ? "destructive" : "default"}
                  >
                    {(ticket.similarity_score * 100).toFixed(0)}% match
                  </Badge>
                </div>
                <p className="text-sm line-clamp-2">
                  {ticket.short_description || "No description"}
                </p>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  {ticket.priority && <span>P{ticket.priority}</span>}
                  {ticket.state && <span>• {ticket.state}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
