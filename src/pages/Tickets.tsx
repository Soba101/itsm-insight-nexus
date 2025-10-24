import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { TicketsTable } from "@/components/TicketsTable";
import { Filters } from "@/lib/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tickets() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters, page],
    queryFn: () => api.getTickets(filters, page, 20),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground">Search and manage IT service tickets</p>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data ? (
        <TicketsTable tickets={data.items} />
      ) : null}
    </div>
  );
}
