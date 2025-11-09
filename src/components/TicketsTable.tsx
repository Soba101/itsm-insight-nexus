import { useState } from "react";
import { Ticket } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, ArrowUpDown, Search, MoreHorizontal } from "lucide-react";
import { TicketDrawer } from "./TicketDrawer";
import { SimilarTicketsModal } from "./SimilarTicketsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TicketsTableProps {
  tickets?: Ticket[];
  selectedTickets?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (ticketId: string, checked: boolean) => void;
}

type SortField = "ticket_id" | "priority" | "status" | "opened_at";
type SortDirection = "asc" | "desc";

export function TicketsTable({ 
  tickets = [], 
  selectedTickets = new Set(),
  onSelectAll,
  onSelectOne 
}: TicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sortField, setSortField] = useState<SortField>("opened_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [similarTicketId, setSimilarTicketId] = useState<string | null>(null);

  const allSelected = tickets.length > 0 && selectedTickets.size === tickets.length;
  const someSelected = selectedTickets.size > 0 && selectedTickets.size < tickets.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === "opened_at") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1": return "destructive";
      case "P2": return "warning";
      case "P3": return "default";
      case "P4": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "default";
      case "In Progress": return "default";
      case "Resolved": return "success";
      case "Closed": return "secondary";
      default: return "default";
    }
  };

  const exportToCSV = () => {
    const headers = ["Ticket ID", "Type", "Priority", "Status", "Service", "Opened At", "Short Description"];
    const rows = tickets.map(t => [
      t.ticket_id,
      t.type,
      t.priority,
      t.status,
      t.service || "",
      t.opened_at,
      t.short_desc,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleFindSimilar = (ticketId: string) => {
    setSimilarTicketId(ticketId);
    setSimilarModalOpen(true);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectAll && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={onSelectAll}
                    aria-label="Select all tickets"
                  />
                </TableHead>
              )}
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("ticket_id")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Ticket ID
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("priority")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Priority
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("status")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Service</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("opened_at")}
                  className="h-8 p-0 hover:bg-transparent"
                >
                  Opened
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.ticket_id}
                className="cursor-pointer hover:bg-muted/50"
              >
                {onSelectOne && selectedTickets && (
                  <TableCell 
                    className="w-12"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Checkbox
                      checked={selectedTickets.has(ticket.ticket_id)}
                      onCheckedChange={(checked) => onSelectOne(ticket.ticket_id, checked as boolean)}
                      aria-label={`Select ticket ${ticket.ticket_id}`}
                    />
                  </TableCell>
                )}
                <TableCell 
                  className="font-medium"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  {ticket.ticket_id}
                </TableCell>
                <TableCell onClick={() => setSelectedTicket(ticket)}>
                  <Badge variant="outline">{ticket.type}</Badge>
                </TableCell>
                <TableCell onClick={() => setSelectedTicket(ticket)}>
                  <Badge variant={getPriorityColor(ticket.priority) as any}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => setSelectedTicket(ticket)}>
                  <Badge variant={getStatusColor(ticket.status) as any}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => setSelectedTicket(ticket)}>
                  {ticket.service || "-"}
                </TableCell>
                <TableCell onClick={() => setSelectedTicket(ticket)}>
                  {new Date(ticket.opened_at).toLocaleDateString()}
                </TableCell>
                <TableCell 
                  className="max-w-xs truncate"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  {ticket.short_desc}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleFindSimilar(ticket.ticket_id)}>
                        <Search className="h-4 w-4 mr-2" />
                        Find Similar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedTicket && (
        <TicketDrawer
          ticket={selectedTicket}
          open={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      <SimilarTicketsModal
        incidentNumber={similarTicketId}
        open={similarModalOpen}
        onOpenChange={setSimilarModalOpen}
        onTicketClick={(incidentNumber) => {
          // Find the ticket and open its drawer
          const ticket = tickets.find(t => t.ticket_id === incidentNumber);
          if (ticket) {
            setSelectedTicket(ticket);
            setSimilarModalOpen(false);
          }
        }}
      />
    </>
  );
}
