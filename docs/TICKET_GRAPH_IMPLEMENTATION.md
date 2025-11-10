# Ticket Relationship Graph - Implementation Summary

## What Was Fixed

### 1. **API Implementation** (`src/lib/api.ts`)

- ✅ Replaced stubbed `getGraphLinks()` method with real implementation
- ✅ Now fetches ticket family data from AI backend endpoint `/api/ai/similarity/tickets/{incident_number}/family`
- ✅ Converts family data (ticket, parent, children) into graph nodes and edges
- ✅ Includes similarity scores on edges
- ✅ Graceful error handling - returns empty graph on failure

### 2. **UI Improvements**

- ✅ **GraphViewer component** - Added empty state message when no relationships exist
- ✅ **Graph page** - Added error handling to display API errors
- ✅ Better user feedback for all scenarios

### 3. **Relationship Establishment Script**

- ✅ Created `backend-python/scripts/establish_ticket_relationships.py`
- ✅ Analyzes embeddings to find similar tickets
- ✅ Assigns parent-child relationships based on semantic similarity
- ✅ Only links tickets where child is newer than parent
- ✅ Configurable similarity threshold (default: 0.75)
- ✅ Dry-run mode for preview
- ✅ Batch processing with progress tracking

### 4. **Documentation**

- ✅ Updated `backend-python/README.md` with script usage
- ✅ Added workflow recommendations
- ✅ Documented all parameters and options

## Current State

### What Works

✅ Graph API endpoint is connected to backend
✅ Graph visualization component handles all states (loading, error, empty, data)
✅ Relationship establishment script is ready to use
✅ Database has embeddings for all tickets

### Why Graph Is Empty

The graph appears empty because **no parent-child relationships have been established yet**. This is expected for a fresh dataset where:

- All tickets have embeddings ✅
- No tickets have `parent_incident` assigned ❌
- No tickets have `child_incidents` populated ❌

## How to Populate the Graph

### Option 1: Run the Script (For Real Data)

```bash
# Preview what would be done
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --dry-run

# Apply with default threshold (0.75)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py

# Use lower threshold for more relationships (0.5-0.7)
docker exec itsm-python-backend python scripts/establish_ticket_relationships.py --min-similarity 0.6
```

### Option 2: Manual Test Data (For Quick Demo)

If you want to test the graph visualization immediately, you can manually create relationships:

```sql
-- Connect to database and manually set relationships
UPDATE servicenow_incidents 
SET parent_incident = 'INC0000007', similarity_score = 0.85 
WHERE incident_number = 'INC0000017';

-- The database trigger will automatically update child_incidents
```

## Understanding Similarity Thresholds

- **0.90-1.0**: Near-identical tickets (exact duplicates)
- **0.75-0.89**: Very similar tickets (likely related)
- **0.60-0.74**: Moderately similar (possibly related)
- **0.50-0.59**: Loosely similar (may or may not be related)
- **< 0.50**: Not similar enough to link

Your current dataset appears to have mostly unique tickets, which is normal for a real ITSM system. You might need to:

1. Lower the threshold to 0.6 or 0.65 to find more relationships
2. Wait for actual duplicate tickets to appear in production
3. Manually create test relationships for demonstration

## Testing the Graph

Once relationships are established:

1. **Visit Graph page** - http://localhost:8080/graph
2. **Enter a ticket ID** - Try one that has relationships
3. **Click "Load"** - Should see nodes and edges
4. **Empty result** - Means that specific ticket has no parent or children

## Architecture Flow

```
User searches ticket → Frontend calls api.getGraphLinks()
    ↓
api.getGraphLinks() → Calls AI backend /tickets/{id}/family
    ↓
AI Backend queries → servicenow_incidents table (parent_incident, child_incidents)
    ↓
Returns family data → Frontend converts to graph nodes/edges
    ↓
GraphViewer renders → Cytoscape.js visualization
```

## Next Steps

1. **Choose your approach:**
   - Run script with lower threshold (recommended for testing)
   - Wait for real duplicates in production
   - Create manual test data

2. **Monitor results:**
   ```bash
   # Check how many tickets have relationships
   curl "http://localhost:3000/servicenow_incidents?parent_incident=not.is.null&select=count"
   ```

3. **Iterate on threshold:**
   - Start at 0.6, see results
   - Adjust up or down based on quality
   - Review false positives/negatives

## Files Changed

- `src/lib/api.ts` - Implemented `getGraphLinks()` method
- `src/components/GraphViewer.tsx` - Added empty state message
- `src/pages/Graph.tsx` - Added error handling
- `backend-python/scripts/establish_ticket_relationships.py` - New script (310 lines)
- `backend-python/README.md` - Added documentation for new script

All code is production-ready and follows the existing patterns in your codebase!
