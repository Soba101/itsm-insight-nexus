import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { TicketsTable } from "@/components/TicketsTable";
import { TicketsStats } from "@/components/TicketsStats";
import { Filters, Ticket } from "@/lib/types";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CheckCircle, Download, Trash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters, page],
    queryFn: () => api.getTickets(filters, page, 20),
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.items) {
      setSelectedTickets(new Set(data.items.map(t => t.ticket_id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleSelectOne = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleBulkAction = async (action: 'assign' | 'close' | 'export' | 'delete') => {
    const ticketIds = Array.from(selectedTickets);
    
    try {
      switch (action) {
        case 'assign':
          toast({
            title: "Assign Tickets",
            description: `${ticketIds.length} ticket(s) will be assigned (feature in development)`,
          });
          break;
        case 'close':
          toast({
            title: "Close Tickets",
            description: `${ticketIds.length} ticket(s) will be closed (feature in development)`,
          });
          break;
        case 'export':
          // Simple CSV export
          const csvContent = generateCSV(data?.items.filter(t => selectedTickets.has(t.ticket_id)) || []);
          downloadCSV(csvContent, `tickets-export-${new Date().toISOString().split('T')[0]}.csv`);
          toast({
            title: "Export Complete",
            description: `Exported ${ticketIds.length} ticket(s) to CSV`,
          });
          setSelectedTickets(new Set());
          break;
        case 'delete':
          toast({
            title: "Delete Tickets",
            description: `${ticketIds.length} ticket(s) will be deleted (feature in development)`,
            variant: "destructive",
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const generateCSV = (tickets: Ticket[]): string => {
    const headers = ['Ticket ID', 'Type', 'Priority', 'Status', 'Category', 'Assignment Group', 'Opened At', 'Description'];
    const rows = tickets.map(t => [
      t.ticket_id,
      t.type,
      t.priority,
      t.status,
      t.category || '',
      t.assignment_group || '',
      t.opened_at,
      `"${(t.description || t.short_desc).replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

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
          <TicketsTable 
            tickets={data.items} 
            selectedTickets={selectedTickets}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
          />
          
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
