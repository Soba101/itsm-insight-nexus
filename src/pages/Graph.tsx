import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraphViewer } from "@/components/GraphViewer";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function Graph() {
  const [ticketId, setTicketId] = useState("INC0001234");
  const [searchId, setSearchId] = useState("INC0001234");

  const { data, isLoading } = useQuery({
    queryKey: ["graph", searchId],
    queryFn: () => api.getGraphLinks(searchId),
    enabled: !!searchId,
  });

  const handleSearch = () => {
    setSearchId(ticketId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ticket Graph</h1>
        <p className="text-muted-foreground">Visualize ticket relationships and dependencies</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter ticket ID..."
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Load
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px]" />
      ) : data ? (
        <GraphViewer data={data} />
      ) : null}
    </div>
  );
}
