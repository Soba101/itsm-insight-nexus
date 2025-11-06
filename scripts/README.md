# Scripts Directory

This directory contains utility scripts for ServiceNow integration.

## Files

### `fetch_servicenow_incidents.py`
Fetches incidents from ServiceNow using the Table API (REST API) with complete field data including:
- caller_id
- assignment_group
- impact
- urgency
- All other incident fields

**Usage:**
```bash
python3 scripts/fetch_servicenow_incidents.py > data/servicenow_incidents_full.json
```

### `insert_servicenow_incidents.py`
Inserts ServiceNow incidents from JSON file into PostgreSQL database.

**Usage:**
```bash
python3 scripts/insert_servicenow_incidents.py
```

**Requirements:**
- psycopg2-binary: `pip3 install psycopg2-binary` or `conda install psycopg2`
- Docker Postgres must be running on port 15432

### `test_servicenow_api.sh`
Test script to verify ServiceNow REST API connectivity and fetch a single incident.

**Usage:**
```bash
./scripts/test_servicenow_api.sh
```

## Data Flow

1. **Fetch** → `fetch_servicenow_incidents.py` → `data/servicenow_incidents_full.json`
2. **Insert** → `insert_servicenow_incidents.py` → Docker PostgreSQL (`servicenow_incidents` table)

## Configuration

All scripts use the ServiceNow credentials from `mcp.json`:
- Instance URL: `https://dev355928.service-now.com`
- Authentication: Basic Auth (admin credentials)
