# Frontend Integration - Similarity Search & Parent-Child Linking

## 📊 Difficulty Rating: **Medium (5/10)**

### Complexity Breakdown

| Component | Difficulty | Reasoning |
|-----------|-----------|-----------|
| API Integration | ⭐⭐ Easy | Backend endpoints ready, just need to wire up API calls |
| Type Definitions | ⭐ Trivial | Types already exist, minor additions needed |
| UI Components | ⭐⭐⭐ Medium | Update existing + create 2-3 new components |
| State Management | ⭐⭐⭐ Medium | React Query already set up, need proper caching strategy |
| User Experience | ⭐⭐⭐⭐ Medium-High | Multiple interaction patterns, need intuitive UI |
| Testing | ⭐⭐ Easy | Straightforward component and integration tests |

**Overall: 5/10 - Medium difficulty, 8-12 hours of focused development**

### Why Medium Difficulty?

**Advantages (makes it easier):**
- ✅ Backend API fully implemented and tested
- ✅ React Query infrastructure already in place
- ✅ Existing UI components to build upon
- ✅ TypeScript provides type safety
- ✅ shadcn-ui components available

**Challenges (makes it harder):**
- ⚠️ Multiple components need updates
- ⚠️ Need to handle parent-child relationships in UI
- ⚠️ UX considerations for displaying similarity scores
- ⚠️ State synchronization across related tickets
- ⚠️ Performance with large result sets

---

## 🎯 Objectives

### Primary Goals

1. **Display Similar Tickets** - Show semantically similar tickets for any given incident
2. **Parent-Child Relationships** - Visualize and manage ticket families
3. **Duplicate Detection** - Proactive warnings when creating potentially duplicate tickets
4. **Search Interface** - Allow users to find similar tickets manually

### Success Criteria

- [ ] Users can view similar tickets with similarity scores
- [ ] Parent-child relationships visible in ticket details
- [ ] Duplicate warnings appear during ticket creation
- [ ] "Find Similar" action available on all tickets
- [ ] Performance: Results load in <2 seconds
- [ ] UI: Intuitive and accessible interface

---

## 📋 Prerequisites

### Backend Requirements (✅ Complete)

- [x] Python FastAPI backend running (port 8000)
- [x] Similarity search endpoints implemented
- [x] All 77 tickets have embeddings
- [x] Embedding worker processing queue
- [x] JWT authentication working
- [x] CORS configured for frontend

### Frontend Requirements (Current State)

- [x] React Query set up
- [x] axios configured
- [x] Auth context with JWT tokens
- [x] Settings page with AI backend URL
- [ ] API methods for similarity (need to implement)
- [ ] UI components for similarity display (need to implement)

### Environment

```bash
# Verify backend is running
curl http://localhost:8000/api/ai/health

# Check embedding coverage
docker exec itsm-postgres psql -U postgres -d itsm_db \
  -c "SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM servicenow_incidents;"

# Test similarity endpoint with token
TOKEN=$(cat ~/.itsm-token)  # Or get from browser localStorage
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/ai/similarity/search \
  -H "Content-Type: application/json" \
  -d '{"incident_number":"INC0010048"}'
```

---

## 🚀 Implementation Plan

### Phase 1: API Layer (2 hours)

#### 1.1 Update Type Definitions (`src/lib/types.ts`)

Add new types for similarity responses:

```typescript
// Similarity search types
export interface SimilarTicket {
  incident_number: string;
  short_description: string | null;
  description: string | null;
  state: string | null;
  priority: string | null;
  opened_at: string | null;
  similarity_score: number;  // 0.0 to 1.0
  already_has_parent: boolean;
}

export interface SimilaritySearchResponse {
  model_name: string;
  embedding_dimension: number;
  query_incident: string | null;
  generated_embedding: boolean;
  results: SimilarTicket[];
}

// Ticket family types
export interface TicketSummary {
  incident_number: string;
  short_description: string | null;
  description: string | null;
  state: string | null;
  priority: string | null;
  opened_at: string | null;
  parent_incident: string | null;
  child_incidents: string[] | null;
  similarity_score: number | null;
}

export interface TicketFamilyResponse {
  parent: TicketSummary | null;
  children: TicketSummary[];
  total_children: number;
}

// Embedding request/response
export interface EmbeddingRequest {
  short_description: string;
  description?: string;
}

export interface EmbeddingResponse {
  model_name: string;
  embedding_dimension: number;
  embedding: number[];
}
```

#### 1.2 Add API Methods (`src/lib/api.ts`)

Replace stub implementations:

```typescript
/**
 * Search for similar tickets using semantic embeddings
 */
async searchSimilarTickets(params: {
  incident_number?: string;
  short_description?: string;
  description?: string;
  top_k?: number;
  min_similarity?: number;
}): Promise<SimilaritySearchResponse> {
  const settings = getSettings();
  const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
  const token = localStorage.getItem("auth-token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await axios.post(
    `${aiBackendUrl}/api/ai/similarity/search`,
    params,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
},

/**
 * Get ticket family (parent + children)
 */
async getTicketFamily(incident_number: string): Promise<TicketFamilyResponse> {
  const settings = getSettings();
  const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
  const token = localStorage.getItem("auth-token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await axios.get(
    `${aiBackendUrl}/api/ai/similarity/tickets/${incident_number}/family`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
},

/**
 * Generate embedding for text (for preview/testing)
 */
async generateEmbedding(data: EmbeddingRequest): Promise<EmbeddingResponse> {
  const settings = getSettings();
  const aiBackendUrl = settings.aiBackendUrl || "http://localhost:8000";
  const token = localStorage.getItem("auth-token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await axios.post(
    `${aiBackendUrl}/api/ai/similarity/embed`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
},

/**
 * Update getDuplicates to use real similarity search
 */
async getDuplicates(filters: Filters): Promise<DuplicateCluster[]> {
  const settings = getSettings();
  
  // If AI backend is not configured, return empty
  if (!settings.aiBackendUrl) {
    return [];
  }
  
  try {
    // Get all tickets
    const tickets = await this.getTickets(filters);
    
    // For each ticket, find similar ones
    const clusters: DuplicateCluster[] = [];
    const processed = new Set<string>();
    
    for (const ticket of tickets.slice(0, 10)) { // Limit to first 10 for performance
      if (processed.has(ticket.incident_number)) continue;
      
      try {
        const result = await this.searchSimilarTickets({
          incident_number: ticket.incident_number,
          top_k: 5,
          min_similarity: 0.85, // High threshold for duplicates
        });
        
        if (result.results.length > 0) {
          const ticketIds = [
            ticket.incident_number,
            ...result.results.map(r => r.incident_number)
          ];
          
          clusters.push({
            cluster_id: `cluster-${ticket.incident_number}`,
            ticket_ids: ticketIds,
            similarity_score: result.results[0]?.similarity_score || 0,
          });
          
          ticketIds.forEach(id => processed.add(id));
        }
      } catch (error) {
        console.error(`Failed to find similar tickets for ${ticket.incident_number}:`, error);
      }
    }
    
    return clusters;
  } catch (error) {
    console.error("Failed to get duplicates:", error);
    return [];
  }
},
```

**Files to Edit:**
- `src/lib/types.ts` - Add new types
- `src/lib/api.ts` - Add methods and update getDuplicates()

---

### Phase 2: Ticket Detail Enhancements (3 hours)

#### 2.1 Create SimilarTicketsCard Component

New file: `src/components/SimilarTicketsCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Link2, AlertTriangle } from "lucide-react";
import { SimilarTicket } from "@/lib/types";

interface SimilarTicketsCardProps {
  incidentNumber: string;
  minSimilarity?: number;
  topK?: number;
}

export function SimilarTicketsCard({ 
  incidentNumber, 
  minSimilarity = 0.7,
  topK = 5 
}: SimilarTicketsCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["similar-tickets", incidentNumber, minSimilarity, topK],
    queryFn: () => api.searchSimilarTickets({
      incident_number: incidentNumber,
      top_k: topK,
      min_similarity: minSimilarity,
    }),
    enabled: !!incidentNumber,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similar Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load similar tickets</p>
        </CardContent>
      </Card>
    );
  }

  const results = data?.results || [];
  const hasPotentialDuplicates = results.some(r => r.similarity_score >= 0.85);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Similar Tickets</CardTitle>
          {hasPotentialDuplicates && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Potential Duplicates
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No similar tickets found
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((ticket) => (
              <div
                key={ticket.incident_number}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  // Navigate to ticket or open drawer
                  window.location.hash = `#ticket-${ticket.incident_number}`;
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ticket.incident_number}</Badge>
                    {ticket.already_has_parent && (
                      <Badge variant="secondary" className="gap-1">
                        <Link2 className="h-3 w-3" />
                        Linked
                      </Badge>
                    )}
                  </div>
                  <Badge 
                    variant={ticket.similarity_score >= 0.85 ? "destructive" : "default"}
                  >
                    {(ticket.similarity_score * 100).toFixed(0)}% match
                  </Badge>
                </div>
                <p className="text-sm line-clamp-2">
                  {ticket.short_description || "No description"}
                </p>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  {ticket.priority && <span>P{ticket.priority}</span>}
                  {ticket.state && <span>• {ticket.state}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 2.2 Create TicketFamilyCard Component

New file: `src/components/TicketFamilyCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Users, ArrowUp, ArrowDown } from "lucide-react";

interface TicketFamilyCardProps {
  incidentNumber: string;
}

export function TicketFamilyCard({ incidentNumber }: TicketFamilyCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["ticket-family", incidentNumber],
    queryFn: () => api.getTicketFamily(incidentNumber),
    enabled: !!incidentNumber,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Family</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasFamily = data?.parent || (data?.children && data.children.length > 0);

  if (!hasFamily) {
    return null; // Don't show if no family
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ticket Family
          </CardTitle>
          {data?.total_children > 0 && (
            <Badge variant="secondary">{data.total_children} related</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent */}
        {data?.parent && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <ArrowUp className="h-4 w-4" />
              Parent Ticket
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline">{data.parent.incident_number}</Badge>
                {data.parent.similarity_score && (
                  <span className="text-xs text-muted-foreground">
                    {(data.parent.similarity_score * 100).toFixed(0)}% similar
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-2">
                {data.parent.short_description || "No description"}
              </p>
            </div>
          </div>
        )}

        {/* Children */}
        {data?.children && data.children.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
              Child Tickets ({data.children.length})
            </div>
            <div className="space-y-2">
              {data.children.map((child) => (
                <div key={child.incident_number} className="p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {child.incident_number}
                    </Badge>
                    {child.similarity_score && (
                      <span className="text-xs text-muted-foreground">
                        {(child.similarity_score * 100).toFixed(0)}% similar
                      </span>
                    )}
                  </div>
                  <p className="text-xs line-clamp-1 text-muted-foreground">
                    {child.short_description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 2.3 Update TicketDrawer Component

Modify `src/components/TicketDrawer.tsx` to include new cards:

```typescript
// Add imports
import { SimilarTicketsCard } from "./SimilarTicketsCard";
import { TicketFamilyCard } from "./TicketFamilyCard";

// Inside drawer content, after existing ticket details, add:
<div className="space-y-4 mt-6">
  <TicketFamilyCard incidentNumber={ticket.incident_number} />
  <SimilarTicketsCard incidentNumber={ticket.incident_number} />
</div>
```

**Files to Create:**
- `src/components/SimilarTicketsCard.tsx`
- `src/components/TicketFamilyCard.tsx`

**Files to Edit:**
- `src/components/TicketDrawer.tsx`

---

### Phase 3: Tickets Table Enhancements (2 hours)

#### 3.1 Add "Find Similar" Action to TicketsTable

Modify `src/components/TicketsTable.tsx`:

```typescript
// Add action column with "Find Similar" button
<DropdownMenuItem onClick={() => handleFindSimilar(ticket.incident_number)}>
  <SearchCheck className="h-4 w-4 mr-2" />
  Find Similar
</DropdownMenuItem>

// Handler function
const handleFindSimilar = (incidentNumber: string) => {
  // Open modal or navigate to results
  setSelectedIncident(incidentNumber);
  setShowSimilarModal(true);
};
```

#### 3.2 Create SimilarTicketsModal Component

New file: `src/components/SimilarTicketsModal.tsx`

```typescript
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
}

export function SimilarTicketsModal({
  incidentNumber,
  open,
  onOpenChange,
}: SimilarTicketsModalProps) {
  if (!incidentNumber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Similar to {incidentNumber}</DialogTitle>
        </DialogHeader>
        <SimilarTicketsCard 
          incidentNumber={incidentNumber} 
          topK={10}
          minSimilarity={0.6}
        />
      </DialogContent>
    </Dialog>
  );
}
```

**Files to Create:**
- `src/components/SimilarTicketsModal.tsx`

**Files to Edit:**
- `src/components/TicketsTable.tsx`

---

### Phase 4: Dashboard Updates (1.5 hours)

#### 4.1 Update DuplicatesPanel to Use Real Data

Modify `src/components/DuplicatesPanel.tsx`:

```typescript
// Remove "Coming soon" message
// Use real clusters from getDuplicates() API call
// Add click handlers to navigate to tickets
// Show similarity scores in clusters
```

#### 4.2 Update Dashboard.tsx and Insights.tsx

Both pages call `getDuplicates()` - they should now display real data:

```typescript
// In Dashboard.tsx and Insights.tsx
const { data: duplicates } = useQuery({
  queryKey: ["duplicates", filters],
  queryFn: () => api.getDuplicates(filters),
  enabled: settings.aiBackendUrl !== undefined, // Only if AI backend configured
});
```

**Files to Edit:**
- `src/components/DuplicatesPanel.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Insights.tsx`

---

### Phase 5: Settings & Configuration (1 hour)

#### 5.1 Add Similarity Settings

Update `src/pages/Settings.tsx`:

```typescript
// Add settings for:
- Enable/disable similarity search
- Minimum similarity threshold (0.6 - 0.95)
- Number of results to show (5, 10, 20)
- Auto-detect duplicates on ticket creation
```

#### 5.2 Update Settings Type

```typescript
export interface Settings {
  // ... existing
  similarityEnabled?: boolean;
  similarityThreshold?: number;
  similarityTopK?: number;
  autoDetectDuplicates?: boolean;
}
```

**Files to Edit:**
- `src/pages/Settings.tsx`
- `src/lib/types.ts` (Settings interface)

---

### Phase 6: Duplicate Warning on Ticket Creation (2.5 hours)

#### 6.1 Create DuplicateWarningBanner Component

New file: `src/components/DuplicateWarningBanner.tsx`

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimilarTicket } from "@/lib/types";

interface DuplicateWarningBannerProps {
  similarTickets: SimilarTicket[];
  onDismiss: () => void;
  onViewTicket: (incidentNumber: string) => void;
}

export function DuplicateWarningBanner({
  similarTickets,
  onDismiss,
  onViewTicket,
}: DuplicateWarningBannerProps) {
  if (similarTickets.length === 0) return null;

  const highestMatch = similarTickets[0];

  return (
    <Alert variant="destructive" className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Potential Duplicate Detected</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Found {similarTickets.length} similar ticket(s). 
          Highest match: <strong>{highestMatch.incident_number}</strong> 
          ({(highestMatch.similarity_score * 100).toFixed(0)}% similar)
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewTicket(highestMatch.incident_number)}
          >
            View Similar Ticket
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Create Anyway
          </Button>
        </div>
      </AlertDescription>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-md p-1 hover:bg-destructive/20"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
```

#### 6.2 Implement Real-time Similarity Check

Add debounced similarity search to ticket creation form:

```typescript
// Use useEffect with debounce to check similarity as user types
const [potentialDuplicates, setPotentialDuplicates] = useState<SimilarTicket[]>([]);

useEffect(() => {
  const timer = setTimeout(async () => {
    if (shortDescription.length > 20) { // Minimum length
      try {
        const result = await api.searchSimilarTickets({
          short_description: shortDescription,
          description: description,
          top_k: 3,
          min_similarity: 0.8,
        });
        setPotentialDuplicates(result.results);
      } catch (error) {
        console.error("Failed to check for duplicates:", error);
      }
    }
  }, 1500); // 1.5 second debounce

  return () => clearTimeout(timer);
}, [shortDescription, description]);
```

**Files to Create:**
- `src/components/DuplicateWarningBanner.tsx`

**Files to Edit:**
- Ticket creation form component (if exists, or note for future implementation)

---

## 📝 Testing Strategy

### Unit Tests

```typescript
// Test API methods
describe("Similarity API", () => {
  it("should search for similar tickets", async () => {
    const result = await api.searchSimilarTickets({
      incident_number: "INC0010048",
    });
    expect(result.results).toBeDefined();
    expect(result.model_name).toBe("text-embedding-embeddinggemma-300m-qat");
  });

  it("should get ticket family", async () => {
    const result = await api.getTicketFamily("INC0010048");
    expect(result).toHaveProperty("parent");
    expect(result).toHaveProperty("children");
  });
});

// Test components
describe("SimilarTicketsCard", () => {
  it("should render loading state", () => {
    // Test with isLoading=true
  });

  it("should render similar tickets", () => {
    // Test with mock data
  });

  it("should show duplicate warning for high similarity", () => {
    // Test with similarity >= 0.85
  });
});
```

### Integration Tests

```typescript
// Test full flow
describe("Similarity Search Flow", () => {
  it("should display similar tickets in drawer", async () => {
    // Open ticket drawer
    // Verify SimilarTicketsCard is rendered
    // Check API call is made
    // Verify results displayed
  });

  it("should detect duplicates during ticket creation", async () => {
    // Start creating ticket
    // Type description
    // Wait for debounce
    // Verify warning appears
  });
});
```

### Manual Testing Checklist

- [ ] Open ticket drawer → Similar tickets section appears
- [ ] Click "Find Similar" → Modal shows results with scores
- [ ] View ticket with parent → Family card shows parent + children
- [ ] Dashboard → Duplicate clusters display with real data
- [ ] Settings → AI backend connection test works
- [ ] Create ticket with duplicate text → Warning appears
- [ ] Click warning "View Similar" → Navigates to ticket
- [ ] Similarity scores display correctly (0-100%)
- [ ] Error states handled gracefully

---

## 🎯 Expected Outcomes

### User Experience Improvements

1. **Proactive Duplicate Prevention**
   - Users warned before creating duplicate tickets
   - Reduces redundant work by 30-40%

2. **Better Ticket Context**
   - Related tickets visible in drawer
   - Parent-child relationships clear
   - Historical context preserved

3. **Efficient Problem Resolution**
   - Find similar resolved tickets quickly
   - Learn from previous solutions
   - Identify patterns across incidents

4. **Data Quality**
   - Cleaner ticket database
   - Better categorization
   - Improved reporting accuracy

### Technical Achievements

- ✅ Full integration with semantic search backend
- ✅ Real-time duplicate detection
- ✅ Parent-child relationship visualization
- ✅ Efficient caching with React Query
- ✅ Type-safe API layer
- ✅ Responsive and accessible UI

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Similar tickets load time | <2s | API response + render |
| Duplicate check (typing) | <1.5s | Debounced search |
| Family tree load | <1s | Single API call |
| Cache hit rate | >80% | React Query metrics |
| UI responsiveness | 60fps | No jank during render |

---

## 🔄 Rollout Plan

### Phase 1: Soft Launch (Week 1)
- Deploy to staging
- Test with small user group (5-10 users)
- Gather feedback on UI/UX
- Monitor performance metrics

### Phase 2: Limited Release (Week 2)
- Deploy to 25% of users
- Monitor error rates
- Collect usage analytics
- Adjust thresholds if needed

### Phase 3: Full Deployment (Week 3)
- Deploy to all users
- Announce feature via in-app notification
- Provide documentation/training
- Monitor adoption rate

---

## 🐛 Known Limitations & Future Work

### Current Limitations

1. **Performance**: Duplicate checking all tickets can be slow (limited to first 10)
2. **No Bulk Actions**: Can't link/unlink tickets in bulk
3. **Limited Customization**: Fixed similarity thresholds
4. **No Manual Override**: Can't manually mark tickets as duplicates/non-duplicates

### Future Enhancements

1. **Advanced Search**: Filter by category, date range, assignee
2. **Bulk Operations**: Link/unlink multiple tickets at once
3. **Custom Thresholds**: Per-user or per-category similarity settings
4. **Analytics Dashboard**: Track duplicate detection effectiveness
5. **ML Improvements**: Retrain model with user feedback
6. **Graph Visualization**: Visual ticket relationship graph

---

## 📚 Resources

### Documentation
- Backend API docs: <http://localhost:8000/docs>
- React Query docs: <https://tanstack.com/query/latest>
- shadcn-ui components: <https://ui.shadcn.com>

### Code References
- Backend implementation: `backend-python/README.md`
- API layer: `src/lib/api.ts`
- Types: `src/lib/types.ts`
- Components: `src/components/`

### Testing
- Component examples: `src/components/TicketsTable.tsx`
- Query patterns: `src/pages/Dashboard.tsx`
- Auth handling: `src/contexts/AuthContext.tsx`

---

## ✅ Checklist

### Pre-Implementation
- [ ] Review backend API endpoints
- [ ] Test endpoints with curl/Postman
- [ ] Verify all tickets have embeddings
- [ ] Check embedding worker is running
- [ ] Confirm JWT authentication works

### Implementation
- [ ] Phase 1: API Layer complete
- [ ] Phase 2: Ticket Detail enhancements complete
- [ ] Phase 3: Table enhancements complete
- [ ] Phase 4: Dashboard updates complete
- [ ] Phase 5: Settings updated
- [ ] Phase 6: Duplicate warning implemented

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests complete
- [ ] Manual testing checklist verified
- [ ] Performance targets met
- [ ] Error handling tested

### Deployment
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Staging deployment successful
- [ ] User acceptance testing complete
- [ ] Production deployment planned

---

**Estimated Total Time: 12-14 hours**

**Recommended Approach**: Implement phases sequentially, test after each phase, and gather feedback before proceeding to the next phase.
