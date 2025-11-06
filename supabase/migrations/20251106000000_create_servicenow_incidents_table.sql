-- Create ServiceNow-compatible incidents table
-- Based on ServiceNow MCP schema
-- Migration created: 2025-11-06

CREATE TABLE public.servicenow_incidents (
  -- Primary identifier
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ServiceNow standard fields
  incident_number TEXT UNIQUE, -- e.g., INC0001234
  sys_id TEXT UNIQUE, -- ServiceNow system ID
  
  -- Basic information (REQUIRED in ServiceNow)
  short_description TEXT NOT NULL,
  description TEXT,
  
  -- User fields
  caller_id TEXT, -- User who reported the incident
  assigned_to TEXT, -- Individual assigned to work the incident
  assignment_group TEXT, -- Group assigned to work the incident
  
  -- Categorization
  category TEXT,
  subcategory TEXT,
  
  -- Priority calculation fields
  impact TEXT CHECK (impact IN ('1', '2', '3')), -- 1=High, 2=Medium, 3=Low
  urgency TEXT CHECK (urgency IN ('1', '2', '3')), -- 1=High, 2=Medium, 3=Low
  priority TEXT CHECK (priority IN ('1', '2', '3', '4', '5')), -- 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning
  
  -- State management
  state TEXT CHECK (state IN ('New', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Cancelled')),
  
  -- Work tracking
  work_notes TEXT, -- Internal notes (IT staff only)
  comments_and_work_notes TEXT, -- Customer-facing comments
  
  -- Resolution fields
  close_code TEXT, -- Resolution categorization
  close_notes TEXT, -- Closure details
  resolution_code TEXT, -- Resolution code
  resolution_notes TEXT, -- Resolution description
  
  -- Timestamps
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- System timestamps
  sys_created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sys_updated_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sys_created_by TEXT,
  sys_updated_by TEXT,
  
  -- Audit fields
  sys_mod_count INTEGER DEFAULT 0, -- Number of updates
  
  -- Additional metadata
  business_service TEXT, -- Service affected
  cmdb_ci TEXT, -- Configuration Item
  
  -- Legacy compatibility (map to existing tickets table)
  legacy_ticket_id TEXT, -- Reference to old tickets.ticket_id
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_sn_incidents_incident_number ON public.servicenow_incidents(incident_number);
CREATE INDEX idx_sn_incidents_sys_id ON public.servicenow_incidents(sys_id);
CREATE INDEX idx_sn_incidents_state ON public.servicenow_incidents(state);
CREATE INDEX idx_sn_incidents_priority ON public.servicenow_incidents(priority);
CREATE INDEX idx_sn_incidents_assignment_group ON public.servicenow_incidents(assignment_group);
CREATE INDEX idx_sn_incidents_assigned_to ON public.servicenow_incidents(assigned_to);
CREATE INDEX idx_sn_incidents_caller_id ON public.servicenow_incidents(caller_id);
CREATE INDEX idx_sn_incidents_opened_at ON public.servicenow_incidents(opened_at);
CREATE INDEX idx_sn_incidents_category ON public.servicenow_incidents(category);

-- Create function to update sys_updated_on timestamp
CREATE OR REPLACE FUNCTION public.update_servicenow_incidents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.sys_updated_on = now();
  NEW.sys_mod_count = COALESCE(OLD.sys_mod_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_servicenow_incidents_timestamp
BEFORE UPDATE ON public.servicenow_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_servicenow_incidents_timestamp();

-- Create function to auto-generate incident number if not provided
CREATE OR REPLACE FUNCTION public.generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    -- Generate incident number based on sequence
    NEW.incident_number := 'INC' || LPAD(nextval('servicenow_incident_seq')::TEXT, 7, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Create sequence for incident numbers
CREATE SEQUENCE IF NOT EXISTS public.servicenow_incident_seq START WITH 1;

-- Create trigger to auto-generate incident numbers
CREATE TRIGGER generate_servicenow_incident_number
BEFORE INSERT ON public.servicenow_incidents
FOR EACH ROW
EXECUTE FUNCTION public.generate_incident_number();

-- Enable Row Level Security (for future use with Supabase)
ALTER TABLE public.servicenow_incidents ENABLE ROW LEVEL SECURITY;

-- Create policies - allow read access to all
CREATE POLICY "Anyone can view servicenow incidents"
ON public.servicenow_incidents
FOR SELECT
USING (true);

-- Create policy for inserting incidents (authenticated users only if using Supabase)
CREATE POLICY "Authenticated users can create servicenow incidents"
ON public.servicenow_incidents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for updating incidents (authenticated users only if using Supabase)
CREATE POLICY "Authenticated users can update servicenow incidents"
ON public.servicenow_incidents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert sample data matching ServiceNow format
INSERT INTO public.servicenow_incidents (
  short_description, 
  description, 
  caller_id, 
  assigned_to, 
  assignment_group,
  category,
  subcategory,
  impact,
  urgency,
  priority,
  state,
  business_service,
  opened_at,
  sys_created_by
)
VALUES 
  (
    'Email service down for multiple users',
    'Users in the Sales department are unable to send or receive emails since 9:00 AM. Error message: "Cannot connect to mail server"',
    'john.doe',
    'jane.smith',
    'IT Support',
    'Email',
    'Outlook',
    '1', -- High impact
    '1', -- High urgency
    '1', -- Critical priority (calculated from impact + urgency)
    'In Progress',
    'Email Service',
    now() - interval '2 hours',
    'system'
  ),
  (
    'Slow network performance in Building A',
    'Multiple users reporting slow internet speeds. Download speeds below 10 Mbps.',
    'alice.johnson',
    'bob.wilson',
    'Network Team',
    'Network',
    'Performance',
    '2', -- Medium impact
    '2', -- Medium urgency
    '2', -- High priority
    'New',
    'Corporate Network',
    now() - interval '30 minutes',
    'system'
  ),
  (
    'Cannot access shared drive',
    'User cannot access \\\\fileserver\\shared drive. Receives "Access Denied" error.',
    'carol.white',
    NULL, -- Not yet assigned to individual
    'IT Support',
    'File Services',
    'Access',
    '3', -- Low impact (single user)
    '2', -- Medium urgency
    '3', -- Moderate priority
    'New',
    'File Services',
    now() - interval '15 minutes',
    'system'
  ),
  (
    'Printer not working in Conference Room B',
    'Printer showing offline status. Already checked cables and power.',
    'david.brown',
    'jane.smith',
    'IT Support',
    'Hardware',
    'Printer',
    '3', -- Low impact
    '3', -- Low urgency
    '4', -- Low priority
    'Resolved',
    'Print Services',
    now() - interval '2 days',
    'system'
  ),
  (
    'VPN connection keeps dropping',
    'Remote user experiencing frequent VPN disconnections every 10-15 minutes.',
    'eve.martin',
    'bob.wilson',
    'Network Team',
    'Network',
    'VPN',
    '2', -- Medium impact
    '2', -- Medium urgency
    '2', -- High priority
    'On Hold',
    'VPN Service',
    now() - interval '4 hours',
    'system'
  );

-- Update resolved incident with resolution details
UPDATE public.servicenow_incidents 
SET 
  resolved_at = now() - interval '1 day',
  resolution_code = 'Solved (Permanently)',
  resolution_notes = 'Replaced printer network cable. Tested successfully.',
  state = 'Resolved',
  work_notes = 'Found faulty network cable. Replaced with new Cat6 cable. Print test successful.'
WHERE short_description LIKE 'Printer not working%';

-- Add comments to show the difference from ServiceNow
COMMENT ON TABLE public.servicenow_incidents IS 'ServiceNow-compatible incidents table based on ServiceNow MCP schema';
COMMENT ON COLUMN public.servicenow_incidents.incident_number IS 'ServiceNow incident number (INC0001234)';
COMMENT ON COLUMN public.servicenow_incidents.sys_id IS 'ServiceNow system ID (UUID)';
COMMENT ON COLUMN public.servicenow_incidents.impact IS '1=High, 2=Medium, 3=Low';
COMMENT ON COLUMN public.servicenow_incidents.urgency IS '1=High, 2=Medium, 3=Low';
COMMENT ON COLUMN public.servicenow_incidents.priority IS '1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning';
COMMENT ON COLUMN public.servicenow_incidents.work_notes IS 'Internal notes visible only to IT staff';
COMMENT ON COLUMN public.servicenow_incidents.comments_and_work_notes IS 'Customer-facing comments';
