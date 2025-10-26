import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Calendar } from "lucide-react";
import { Filters, Priority, TicketType, TicketStatus } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

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

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap gap-3 p-4 border rounded-lg bg-card">
      <Input
        placeholder="Search tickets..."
        value={filters.query || ""}
        onChange={(e) => updateFilter("query", e.target.value)}
        className="w-64"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            {filters.dateFrom ? format(new Date(filters.dateFrom), "PPP") : "From date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
            onSelect={(date) => updateFilter("dateFrom", date ? format(date, "yyyy-MM-dd") : undefined)}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            {filters.dateTo ? format(new Date(filters.dateTo), "PPP") : "To date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
            onSelect={(date) => updateFilter("dateTo", date ? format(date, "yyyy-MM-dd") : undefined)}
          />
        </PopoverContent>
      </Popover>
      
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

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
