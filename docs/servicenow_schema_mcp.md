# ServiceNow Incident Schema (MCP)

This document describes the incident ticket schema exposed by the ServiceNow Model Context Protocol (MCP) server.

**Generated on:** 6 November 2025  
**Source:** ServiceNow MCP Tools  
**Updated:** 6 November 2025 - Added REST API comparison

---

## ⚠️ Important Note: MCP Limitations

**The ServiceNow MCP server returns LIMITED fields.** For complete incident data including `caller_id`, `assignment_group`, `impact`, and `urgency`, use the **ServiceNow REST API** instead.

### MCP vs REST API Comparison

| Field | MCP | REST API | Notes |
|-------|-----|----------|-------|
| caller_id | ❌ Not returned | ✅ Available | Who reported the incident |
| assignment_group | ❌ Not returned | ✅ Available | Group assigned to work |
| impact | ❌ Not returned | ✅ Available | 1-3 scale (High/Medium/Low) |
| urgency | ❌ Not returned | ✅ Available | 1-3 scale (High/Medium/Low) |
| priority | ✅ Combined format | ✅ Detailed | MCP: "1 - Critical", API: separate field |
| assigned_to | ✅ Available | ✅ Available | Individual assignee |
| All other fields | ✅ Basic fields | ✅ All fields | REST API provides complete data |

**Recommendation:** Use `scripts/fetch_servicenow_incidents.py` to fetch complete incident data via REST API.

---

## Overview

The ServiceNow MCP provides a set of tools for managing incidents in ServiceNow. This schema documentation is derived from the available MCP tool parameters.

## Available Operations

1. **Create Incident** - Create a new incident ticket
2. **Update Incident** - Update an existing incident
3. **Get Incident** - Retrieve incident details by number
4. **List Incidents** - Query and filter incidents
5. **Resolve Incident** - Mark an incident as resolved
6. **Add Comment** - Add comments or work notes to an incident

---

## Core Incident Fields

### Incident Identifiers

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `incident_id` | string | Yes (for updates) | Incident ID or sys_id |
| `incident_number` | string | Yes (for retrieval) | The number of the incident (e.g., INC0001234) |

### Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `short_description` | string | Yes (create) | Short description of the incident |
| `description` | string | No | Detailed description of the incident |

### Assignment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `caller_id` | string | No | User who reported the incident |
| `assigned_to` | string | No | User assigned to the incident |
| `assignment_group` | string | No | Group assigned to the incident |

### Categorization

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | No | Category of the incident |
| `subcategory` | string | No | Subcategory of the incident |

### Priority & Impact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `priority` | string | No | Priority of the incident |
| `impact` | string | No | Impact of the incident |
| `urgency` | string | No | Urgency of the incident |

### State Management

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | string | No | State of the incident (e.g., New, In Progress, Resolved, Closed) |

### Work Notes & Comments

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `work_notes` | string | No | Work notes to add to the incident |
| `comment` | string | Yes (add comment) | Comment to add to the incident |
| `is_work_note` | boolean | No (default: false) | Whether the comment is a work note |

### Resolution

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `close_code` | string | No | Close code for the incident |
| `close_notes` | string | No | Close notes to add to the incident |
| `resolution_code` | string | Yes (resolve) | Resolution code for the incident |
| `resolution_notes` | string | Yes (resolve) | Resolution notes for the incident |

---

## Operation Details

### 1. Create Incident

**Tool:** `mcp_servicenow_create_incident`

**Required Fields:**
- `short_description` (string)

**Optional Fields:**
- `description` (string)
- `caller_id` (string)
- `assigned_to` (string)
- `assignment_group` (string)
- `category` (string)
- `subcategory` (string)
- `impact` (string)
- `urgency` (string)
- `priority` (string)

**Example:**
```json
{
  "short_description": "Cannot access email",
  "description": "User reports inability to access Outlook email since this morning",
  "caller_id": "john.doe",
  "category": "Email",
  "impact": "2",
  "urgency": "2",
  "priority": "2"
}
```

---

### 2. Update Incident

**Tool:** `mcp_servicenow_update_incident`

**Required Fields:**
- `incident_id` (string) - Incident ID or sys_id

**Optional Fields:**
- `short_description` (string)
- `description` (string)
- `assigned_to` (string)
- `assignment_group` (string)
- `category` (string)
- `subcategory` (string)
- `impact` (string)
- `urgency` (string)
- `priority` (string)
- `state` (string)
- `work_notes` (string)
- `close_notes` (string)
- `close_code` (string)

**Example:**
```json
{
  "incident_id": "INC0001234",
  "state": "In Progress",
  "assigned_to": "jane.smith",
  "work_notes": "Started investigating the email access issue"
}
```

---

### 3. Get Incident by Number

**Tool:** `mcp_servicenow_get_incident_by_number`

**Required Fields:**
- `incident_number` (string) - The number of the incident to fetch

**Example:**
```json
{
  "incident_number": "INC0001234"
}
```

---

### 4. List Incidents

**Tool:** `mcp_servicenow_list_incidents`

**Optional Fields:**
- `query` (string) - Search query for incidents
- `state` (string) - Filter by incident state
- `assigned_to` (string) - Filter by assigned user
- `category` (string) - Filter by category
- `limit` (integer, default: 10) - Maximum number of incidents to return
- `offset` (integer, default: 0) - Offset for pagination

**Example:**
```json
{
  "state": "In Progress",
  "assigned_to": "jane.smith",
  "limit": 20,
  "offset": 0
}
```

---

### 5. Resolve Incident

**Tool:** `mcp_servicenow_resolve_incident`

**Required Fields:**
- `incident_id` (string) - Incident ID or sys_id
- `resolution_code` (string) - Resolution code for the incident
- `resolution_notes` (string) - Resolution notes for the incident

**Example:**
```json
{
  "incident_id": "INC0001234",
  "resolution_code": "Solved (Permanently)",
  "resolution_notes": "Reset user's email password and verified access"
}
```

---

### 6. Add Comment

**Tool:** `mcp_servicenow_add_comment`

**Required Fields:**
- `incident_id` (string) - Incident ID or sys_id
- `comment` (string) - Comment to add to the incident

**Optional Fields:**
- `is_work_note` (boolean, default: false) - Whether the comment is a work note

**Example:**
```json
{
  "incident_id": "INC0001234",
  "comment": "User confirmed email access is working",
  "is_work_note": false
}
```

---

## Field Value Guidelines

### Priority Values
Typically represented as numeric strings:
- `1` - Critical
- `2` - High
- `3` - Moderate
- `4` - Low
- `5` - Planning

### Impact Values
Typically represented as numeric strings:
- `1` - High
- `2` - Medium
- `3` - Low

### Urgency Values
Typically represented as numeric strings:
- `1` - High
- `2` - Medium
- `3` - Low

### State Values
Common state values (may vary by ServiceNow configuration):
- `New`
- `In Progress`
- `On Hold`
- `Resolved`
- `Closed`
- `Cancelled`

---

## Notes

1. **Field Types**: Most fields accept string values. Numeric values for priority, impact, and urgency are typically passed as strings.

2. **User References**: Fields like `caller_id`, `assigned_to` should use user IDs or usernames as configured in your ServiceNow instance.

3. **sys_id vs Display Values**: The `incident_id` field can accept either the incident number (e.g., "INC0001234") or the sys_id (internal ServiceNow ID).

4. **Work Notes vs Comments**: Work notes are internal notes visible only to IT staff, while comments may be visible to end users depending on configuration.

5. **State Transitions**: ServiceNow may enforce certain state transition rules. Not all state changes may be allowed depending on your instance configuration.

---

## Integration with ITSM Insight Nexus

This schema can be used to:
- Map ServiceNow incident fields to the application's internal data model
- Design API adapters for ServiceNow integration
- Create forms and UI components that match ServiceNow's data structure
- Validate data before sending to ServiceNow

### Current Implementation

**✅ Using ServiceNow REST API (Recommended)**

We have implemented complete data fetching using ServiceNow REST API instead of MCP:

**Scripts:**
- `scripts/fetch_servicenow_incidents.py` - Fetches incidents via REST API with ALL fields
- `scripts/insert_servicenow_incidents.py` - Inserts complete data into PostgreSQL
- `scripts/test_servicenow_api.sh` - Test REST API connectivity

**Database:**
- Table: `servicenow_incidents` (Docker Postgres)
- **76 incidents** loaded with complete fields:
  - ✅ caller_id (76/76)
  - ✅ assignment_group (47/76)
  - ✅ impact (76/76)
  - ✅ urgency (76/76)
  - ✅ All other ServiceNow fields

**Data Source:**
- ServiceNow Instance: `https://dev355928.service-now.com`
- API: Table API (`/api/now/table/incident`)
- Authentication: Basic Auth

See also:
- `docs/SCHEMA_COMPARISON.md` - Comparison of different ITSM schemas
- `src/lib/types.ts` - Application data types
- `src/lib/api.ts` - API integration layer
- `scripts/README.md` - Script documentation
