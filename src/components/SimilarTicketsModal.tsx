import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimilarTicketsCard } from "./SimilarTicketsCard";

interface SimilarTicketsModalProps {
  incidentNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketClick?: (incidentNumber: string) => void;
}

export function SimilarTicketsModal({
  incidentNumber,
  open,
  onOpenChange,
  onTicketClick,
}: SimilarTicketsModalProps) {
  if (!incidentNumber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Similar to {incidentNumber}</DialogTitle>
        </DialogHeader>
        <SimilarTicketsCard 
          incidentNumber={incidentNumber} 
          topK={10}
          minSimilarity={0.6}
          onTicketClick={onTicketClick}
        />
      </DialogContent>
    </Dialog>
  );
}
