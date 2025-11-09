import { useState } from "react";
import { Ticket } from "@/lib/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, ArrowUp, CheckCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SimilarTicketsCard } from "./SimilarTicketsCard";
import { TicketFamilyCard } from "./TicketFamilyCard";

interface TicketDrawerProps {
  ticket: Ticket;
  open: boolean;
  onClose: () => void;
}

export function TicketDrawer({ ticket, open, onClose }: TicketDrawerProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const slaBadgeVariant: BadgeProps["variant"] = ticket.sla_met ? "success" : "destructive";

  const handleAssign = async () => {
    setActionLoading("assign");
    try {
      // TODO: Implement assign API call
      toast({
        title: "Assigned",
        description: `Ticket ${ticket.ticket_id} assigned to you`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    setActionLoading("escalate");
    try {
      // TODO: Implement escalate API call
      toast({
        title: "Escalated",
        description: `Ticket ${ticket.ticket_id} has been escalated`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to escalate ticket",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async () => {
    setActionLoading("close");
    try {
      // TODO: Implement close ticket API call
      toast({
        title: "Closed",
        description: `Ticket ${ticket.ticket_id} has been closed`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ticket.ticket_id}</SheetTitle>
          <SheetDescription>{ticket.short_desc}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Badge variant="outline">{ticket.type}</Badge>
            <Badge>{ticket.priority}</Badge>
            <Badge variant={slaBadgeVariant}>
              {ticket.sla_met ? "SLA Met" : "SLA Missed"}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-sm">{ticket.status}</p>
            </div>

            {ticket.service && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service</p>
                <p className="text-sm">{ticket.service}</p>
              </div>
            )}

            {ticket.assignment_group && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assignment Group</p>
                <p className="text-sm">{ticket.assignment_group}</p>
              </div>
            )}

            {ticket.category && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{ticket.category}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Opened At</p>
              <p className="text-sm">{new Date(ticket.opened_at).toLocaleString()}</p>
            </div>

            {ticket.resolved_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved At</p>
                <p className="text-sm">{new Date(ticket.resolved_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          <Separator />

          {ticket.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-sm">{ticket.description}</p>
            </div>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleAssign}
              disabled={actionLoading !== null}
              variant="default"
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              {actionLoading === "assign" ? "Assigning..." : "Assign to Me"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleEscalate}
                disabled={actionLoading !== null}
                variant="outline"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {actionLoading === "escalate" ? "..." : "Escalate"}
              </Button>
              <Button
                onClick={handleClose}
                disabled={actionLoading !== null || ticket.status === "Closed"}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {actionLoading === "close" ? "..." : "Close"}
              </Button>
            </div>
          </div>

          {/* AI Summary feature - coming soon
          <Button
            onClick={generateSummary}
            disabled={loading}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate AI Summary"}
          </Button>

          {summary && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">AI Summary</p>
              <p className="text-sm">{summary}</p>
            </div>
          )}
          */}

          {/* Ticket Family and Similar Tickets */}
          <Separator />
          <div className="space-y-4 mt-4">
            <TicketFamilyCard 
              incidentNumber={ticket.ticket_id}
              onTicketClick={(incidentNumber) => {
                // TODO: Navigate to the clicked ticket or open its drawer
                console.log("Navigate to ticket:", incidentNumber);
              }}
            />
            <SimilarTicketsCard 
              incidentNumber={ticket.ticket_id}
              onTicketClick={(incidentNumber) => {
                // TODO: Navigate to the clicked ticket or open its drawer
                console.log("Navigate to ticket:", incidentNumber);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
