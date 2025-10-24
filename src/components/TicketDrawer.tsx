import { useState } from "react";
import { Ticket } from "@/lib/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TicketDrawerProps {
  ticket: Ticket;
  open: boolean;
  onClose: () => void;
}

export function TicketDrawer({ ticket, open, onClose }: TicketDrawerProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateSummary = async () => {
    setLoading(true);
    try {
      const result = await api.getSummary([ticket.ticket_id]);
      setSummary(result.text);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <Badge variant={ticket.sla_met ? "success" : "destructive" as any}>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
