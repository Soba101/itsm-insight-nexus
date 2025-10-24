import { useState } from "react";
import { Ticket } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TicketDrawer } from "./TicketDrawer";

interface TicketsTableProps {
  tickets: Ticket[];
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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
              <TableHead>Ticket ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.ticket_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTicket(ticket)}
              >
                <TableCell className="font-medium">{ticket.ticket_id}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ticket.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getPriorityColor(ticket.priority) as any}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(ticket.status) as any}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.service || "-"}</TableCell>
                <TableCell>
                  {new Date(ticket.opened_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {ticket.short_desc}
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
    </>
  );
}
