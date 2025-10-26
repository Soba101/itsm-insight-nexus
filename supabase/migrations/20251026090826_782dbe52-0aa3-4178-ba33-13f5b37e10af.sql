-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('incident', 'problem', 'change')),
  category TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  assignment_group TEXT,
  service TEXT,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  sla_met BOOLEAN,
  parent_id TEXT,
  related_ticket_id TEXT,
  short_desc TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create policies - allow read access to all authenticated users
CREATE POLICY "Anyone can view tickets"
ON public.tickets
FOR SELECT
USING (true);

-- Create policy for inserting tickets (authenticated users only)
CREATE POLICY "Authenticated users can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for updating tickets (authenticated users only)
CREATE POLICY "Authenticated users can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_type ON public.tickets(type);
CREATE INDEX idx_tickets_opened_at ON public.tickets(opened_at);
CREATE INDEX idx_tickets_service ON public.tickets(service);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.tickets (ticket_id, type, priority, status, service, short_desc, description, category, assignment_group, opened_at)
VALUES 
  ('INC001', 'incident', 'P1', 'Open', 'Email', 'Email service down', 'Users unable to send or receive emails', 'Infrastructure', 'IT Support', now() - interval '2 hours'),
  ('INC002', 'incident', 'P2', 'In Progress', 'Network', 'Slow network performance', 'Users reporting slow internet speeds', 'Network', 'Network Team', now() - interval '5 hours'),
  ('PRB001', 'problem', 'P2', 'Open', 'Database', 'Database connection issues', 'Intermittent database timeouts', 'Database', 'Database Team', now() - interval '1 day'),
  ('CHG001', 'change', 'P3', 'Resolved', 'Server', 'Server maintenance', 'Scheduled server updates completed', 'Infrastructure', 'IT Support', now() - interval '3 days'),
  ('INC003', 'incident', 'P4', 'Closed', 'Printer', 'Printer not working', 'Printer issue resolved', 'Hardware', 'IT Support', now() - interval '1 week');