import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { TicketsTable } from "@/components/TicketsTable";
import { TicketsStats } from "@/components/TicketsStats";
import { Filters } from "@/lib/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Tickets() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters, page],
    queryFn: () => api.getTickets(filters, page, 20),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <p className="text-muted-foreground">Search and manage IT service tickets</p>
      </div>

      <TicketsStats data={data} />

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data && data.items.length > 0 ? (
        <>
          <TicketsTable tickets={data.items} />
          
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setPage(pageNum)}
                        isActive={page === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-card">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No tickets found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query</p>
          </div>
        </div>
      )}
    </div>
  );
}
