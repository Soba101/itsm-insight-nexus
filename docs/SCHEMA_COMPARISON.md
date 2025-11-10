# Schema Comparison: Postgres (Docker) vs ServiceNow

This document compares the simplified Postgres database schema used in this project with ServiceNow's standard ITSM tables.

## Architecture Differences

### Postgres (This Project)

- **Single table:** `tickets`
- **Type discriminator:** Uses `type` column to distinguish incident/problem/change
- **Simplified schema:** Focused on analytics and insights
- **No relationships:** Flattened structure for easier querying

### ServiceNow

- **Multiple tables:** Separate tables for each record type
  - `incident` (extends `task`)
  - `problem` (extends `task`)
  - `change_request` (extends `task`)
  - `task` (parent table with common fields)
- **Table inheritance:** Child tables inherit from parent `task` table
- **Complex relationships:** Deep CMDB integration, approvals, workflows
- **Extensive fields:** 100+ columns per table with business rules

## Field-by-Field Comparison

### ✅ Fields Present in Both

| Our Postgres Field | ServiceNow Field | Notes |
|-------------------|------------------|-------|
| `ticket_id` | `number` | Unique identifier (INC001, PRB001, CHG001) |
| `type` | (table name) | We use discriminator; ServiceNow uses separate tables |
| `priority` | `priority` | Both use similar values (P1-P4 vs 1-5) |
| `status` | `state` | Status/state of the ticket |
| `category` | `category` | Categorization field |
| `assignment_group` | `assignment_group` | Group assigned to work the ticket |
| `service` | `business_service` or `cmdb_ci` | Service affected |
| `opened_at` | `opened_at` | Timestamp when created |
| `resolved_at` | `resolved_at` | Timestamp when resolved |
| `short_desc` | `short_description` | Brief summary |
| `description` | `description` | Detailed description |
| `created_at` | `sys_created_on` | System timestamp |
| `updated_at` | `sys_updated_on` | Last modified timestamp |

### ❌ ServiceNow Fields Missing in Our Schema

**User/Ownership Fields:**

- `caller_id` - Person who reported the issue
- `assigned_to` - Individual assigned (we only have group)
- `opened_by` - User who opened the record
- `resolved_by` - User who resolved
- `closed_by` - User who closed

**CMDB Integration:**

- `cmdb_ci` - Configuration Item affected
- `ci_class` - CI class/type
- `impact` - Business impact (separate from priority)
- `urgency` - Urgency level (combines with impact for priority)

**Workflow & Approval:**

- `approval` - Approval state
- `approval_set` - Approval set timestamp
- `approval_history` - Related approvals
- `work_notes` - Internal notes (vs customer-facing comments)
- `comments` - Customer-facing comments

**SLA Fields:**

- `sla_due` - SLA breach time
- `business_duration` - Time in business hours
- `calendar_duration` - Actual elapsed time
- `time_worked` - Actual work time logged

**Change-Specific (for change_request):**

- `start_date` - Planned start
- `end_date` - Planned end
- `implementation_plan` - How to implement
- `backout_plan` - How to rollback
- `test_plan` - Testing approach
- `risk` - Risk assessment
- `impact_analysis` - Impact description
- `cab_required` - Change Advisory Board needed
- `cab_date` - CAB meeting date

**Problem-Specific (for problem):**

- `root_cause` - Root cause description
- `workaround` - Temporary fix
- `known_error` - Related known error
- `fix_notes` - Resolution notes

**Incident-Specific (for incident):**

- `severity` - Severity level (different from priority)
- `hold_reason` - Why on hold
- `close_code` - Resolution code
- `close_notes` - Closure details
- `reopen_count` - Times reopened
- `child_incidents` - Related child incidents

**Audit & System Fields:**

- `sys_id` - Universal unique identifier (UUID)
- `sys_created_by` - Username who created
- `sys_updated_by` - Username who last updated
- `sys_mod_count` - Number of updates
- `sys_domain` - Domain/company
- `sys_class_name` - Table name

**Communication:**

- `contact_type` - How reported (phone, email, self-service)
- `notify` - Notification level
- `comments_and_work_notes` - Combined field

**Location & Organization:**

- `location` - Physical location
- `company` - Company/organization
- `department` - Department

### ✅ Fields in Our Schema Not in ServiceNow

| Our Field | Purpose | Notes |
|-----------|---------|-------|
| `id` (UUID) | Primary key | ServiceNow uses `sys_id` instead |
| `parent_id` | Parent ticket reference | ServiceNow uses `parent` but more structured |
| `related_ticket_id` | Related ticket | ServiceNow has multiple relationship types |

### 🔄 Data Type & Constraint Differences

**Our Postgres:**

```sql
type TEXT CHECK (type IN ('incident', 'problem', 'change'))
priority TEXT CHECK (priority IN ('P1', 'P2', 'P3', 'P4'))
status TEXT CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'))
```

**ServiceNow:**

- Uses integer choice fields (1-5) with display values
- `state` values differ by table:
  - Incident: 1=New, 2=In Progress, 6=Resolved, 7=Closed, 8=Canceled
  - Problem: 1=New, 2=Known Error, 3=Fix in Progress, 100=Resolved, 101=Closed
  - Change: -5=Pending, 1=Scheduled, 2=Implement, 3=Review, 4=Closed, 7=Canceled
- Priority: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning

## Use Case Differences

### Our Postgres Schema

**Optimized for:**

- Analytics and reporting
- Fast aggregations across all ticket types
- Simplified data model for dashboards
- Read-heavy workload
- Time-series analysis

**Trade-offs:**

- No workflow enforcement
- Limited auditability
- No user/role management
- No CMDB integration
- Simplified relationships

### ServiceNow Schema

**Optimized for:**

- Full ITSM workflow management
- Compliance and audit trails
- Complex approvals and routing
- CMDB integration
- User management and permissions
- Business rules and automation

**Trade-offs:**

- More complex queries
- Heavier database structure
- Requires ServiceNow platform

## Migration Considerations

If you need to sync data from ServiceNow to our Postgres database, you would:

1. **Map fields:** Use the comparison table above
2. **Handle missing data:** Decide how to handle ServiceNow-only fields
3. **Transform IDs:** Convert ServiceNow `sys_id` to our format
4. **Flatten relationships:** Resolve reference fields (assignment_group, caller_id)
5. **Normalize states:** Map ServiceNow's numeric states to our text values
6. **Handle types:** Filter by table name and map to our `type` field

Example mapping:

```javascript
// ServiceNow -> Postgres
{
  ticket_id: incident.number,              // "INC0012345"
  type: "incident",                        // derived from table
  priority: mapPriority(incident.priority), // 1 -> "P1"
  status: mapState(incident.state),        // 2 -> "In Progress"
  service: incident.business_service?.name,
  opened_at: incident.opened_at,
  // ... etc
}
```

## Summary

Our Postgres schema is a **simplified, analytics-focused subset** of ServiceNow's full ITSM tables. It captures the essential fields needed for:

- Ticket tracking and metrics
- Trend analysis
- Performance reporting (MTTR, SLA compliance)
- Topic modeling and duplicate detection

It intentionally omits operational workflow fields that are not needed for analytics dashboards.
