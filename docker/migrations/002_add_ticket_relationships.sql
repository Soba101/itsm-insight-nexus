-- Migration 002: Add Ticket Relationship Fields for Parent-Child Linking
-- Created: 2025-11-08
-- Purpose: Enable semantic similarity-based parent-child ticket linking

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add parent-child relationship columns to servicenow_incidents
ALTER TABLE public.servicenow_incidents
ADD COLUMN IF NOT EXISTS parent_incident TEXT,  -- Reference to parent incident_number (e.g., "INC0010052")
ADD COLUMN IF NOT EXISTS child_incidents TEXT[] DEFAULT '{}',  -- Array of child incident_numbers
ADD COLUMN IF NOT EXISTS similarity_score FLOAT,  -- Similarity score to parent (0.0-1.0)
ADD COLUMN IF NOT EXISTS embedding vector(768),  -- Semantic embedding (768-dim for all-mpnet-base-v2)
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'sentence-transformers/all-mpnet-base-v2',  -- Model used
ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMP WITH TIME ZONE;  -- When embedding was generated

-- Add foreign key constraint for parent_incident (self-referencing)
ALTER TABLE public.servicenow_incidents
ADD CONSTRAINT fk_parent_incident
FOREIGN KEY (parent_incident)
REFERENCES public.servicenow_incidents(incident_number)
ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sn_parent_incident ON public.servicenow_incidents(parent_incident);
CREATE INDEX IF NOT EXISTS idx_sn_similarity_score ON public.servicenow_incidents(similarity_score DESC) WHERE similarity_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sn_embedding_model ON public.servicenow_incidents(embedding_model);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This enables fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_sn_embedding_vector ON public.servicenow_incidents 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Create function to update child_incidents array when parent is set
CREATE OR REPLACE FUNCTION update_parent_children()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_incident is set, add this incident to parent's child_incidents array
  IF NEW.parent_incident IS NOT NULL THEN
    UPDATE public.servicenow_incidents
    SET child_incidents = array_append(
      COALESCE(child_incidents, '{}'),
      NEW.incident_number
    )
    WHERE incident_number = NEW.parent_incident
    AND NOT (NEW.incident_number = ANY(COALESCE(child_incidents, '{}')));
  END IF;
  
  -- If parent_incident changed from old value, remove from old parent's children
  IF OLD.parent_incident IS NOT NULL AND OLD.parent_incident != NEW.parent_incident THEN
    UPDATE public.servicenow_incidents
    SET child_incidents = array_remove(child_incidents, NEW.incident_number)
    WHERE incident_number = OLD.parent_incident;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;

-- Create trigger to automatically maintain child_incidents array
CREATE TRIGGER trigger_update_parent_children
AFTER INSERT OR UPDATE OF parent_incident ON public.servicenow_incidents
FOR EACH ROW
EXECUTE FUNCTION update_parent_children();

-- Create view for easy parent-child relationship queries
CREATE OR REPLACE VIEW ticket_families AS
SELECT 
  parent.incident_number AS parent_incident,
  parent.short_description AS parent_description,
  parent.state AS parent_state,
  parent.priority AS parent_priority,
  parent.opened_at AS parent_opened_at,
  child.incident_number AS child_incident,
  child.short_description AS child_description,
  child.state AS child_state,
  child.similarity_score,
  child.opened_at AS child_opened_at
FROM public.servicenow_incidents parent
LEFT JOIN public.servicenow_incidents child 
  ON child.parent_incident = parent.incident_number
WHERE parent.parent_incident IS NULL  -- Only show root parents
ORDER BY parent.opened_at DESC, child.similarity_score DESC NULLS LAST;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.servicenow_incidents TO postgres;
GRANT SELECT ON ticket_families TO postgres;

-- Add comments for documentation
COMMENT ON COLUMN public.servicenow_incidents.parent_incident IS 'Reference to parent incident_number if this is a child ticket';
COMMENT ON COLUMN public.servicenow_incidents.child_incidents IS 'Array of child incident_numbers linked to this parent';
COMMENT ON COLUMN public.servicenow_incidents.similarity_score IS 'Cosine similarity score to parent (0.0-1.0), set during automatic linking';
COMMENT ON COLUMN public.servicenow_incidents.embedding IS 'Vector embedding of ticket description for semantic similarity search';
COMMENT ON COLUMN public.servicenow_incidents.embedding_model IS 'Name of the sentence-transformer model used to generate embedding';
COMMENT ON COLUMN public.servicenow_incidents.embedded_at IS 'Timestamp when embedding was generated';

-- Migration complete
RAISE NOTICE 'Migration 002 complete: Added parent-child relationship fields and pgvector support';
