import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Filters, Priority, TicketType, TicketStatus } from "@/lib/types";

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap gap-3 p-4 border rounded-lg bg-card">
      <Input
        placeholder="Search tickets..."
        value={filters.query || ""}
        onChange={(e) => updateFilter("query", e.target.value)}
        className="w-64"
      />
      
      <Select value={filters.priority || ""} onValueChange={(v) => updateFilter("priority", v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="P1">P1</SelectItem>
          <SelectItem value="P2">P2</SelectItem>
          <SelectItem value="P3">P3</SelectItem>
          <SelectItem value="P4">P4</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.ticketType || ""} onValueChange={(v) => updateFilter("ticketType", v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="incident">Incident</SelectItem>
          <SelectItem value="problem">Problem</SelectItem>
          <SelectItem value="change">Change</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status || ""} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Open">Open</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Resolved">Resolved</SelectItem>
          <SelectItem value="Closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={clearFilters}>
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
