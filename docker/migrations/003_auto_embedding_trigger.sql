-- Migration: Auto-generate embeddings on ticket insert/update
-- This creates a trigger that marks tickets for embedding generation

-- Step 1: Create a queue table for pending embeddings
CREATE TABLE IF NOT EXISTS embedding_queue (
    id SERIAL PRIMARY KEY,
    incident_number TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    retries INT DEFAULT 0,
    last_error TEXT,
    UNIQUE(incident_number)
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_created ON embedding_queue(created_at);

-- Step 2: Create function to queue tickets for embedding
CREATE OR REPLACE FUNCTION queue_for_embedding()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if embedding is NULL
    IF NEW.embedding IS NULL THEN
        INSERT INTO embedding_queue (incident_number, status)
        VALUES (NEW.incident_number, 'pending')
        ON CONFLICT (incident_number) 
        DO UPDATE SET 
            status = 'pending',
            created_at = NOW(),
            retries = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on INSERT
DROP TRIGGER IF EXISTS trigger_queue_new_incidents ON servicenow_incidents;
CREATE TRIGGER trigger_queue_new_incidents
    AFTER INSERT ON servicenow_incidents
    FOR EACH ROW
    EXECUTE FUNCTION queue_for_embedding();

-- Step 4: Create trigger on UPDATE (when description changes)
DROP TRIGGER IF EXISTS trigger_queue_updated_incidents ON servicenow_incidents;
CREATE TRIGGER trigger_queue_updated_incidents
    AFTER UPDATE OF short_description, description ON servicenow_incidents
    FOR EACH ROW
    WHEN (NEW.embedding IS NULL)
    EXECUTE FUNCTION queue_for_embedding();

COMMENT ON TABLE embedding_queue IS 'Queue for tickets awaiting embedding generation';
COMMENT ON FUNCTION queue_for_embedding() IS 'Trigger function to queue tickets for embedding generation';
