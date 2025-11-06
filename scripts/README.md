# Scripts Directory

This directory contains utility scripts for ServiceNow integration.

## Setup

### Install Dependencies

```bash
# Using pip
pip install -r scripts/requirements.txt

# Or using conda
conda activate itsm
pip install -r scripts/requirements.txt
```

### Environment Variables

All scripts now use environment variables from the `.env` file in the project root. Required variables:

```env
SERVICENOW_INSTANCE_URL="https://dev305874.service-now.com"
SERVICENOW_USERNAME="admin"
SERVICENOW_PASSWORD="your_password"
SERVICENOW_AUTH_TYPE="basic"
```

Optional database configuration (defaults shown):
```env
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="itsm_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

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

~~All scripts use the ServiceNow credentials from `mcp.json`~~

**Updated:** All scripts now read credentials from the `.env` file using `python-dotenv`.

### MCP Server Configuration

To configure the ServiceNow MCP server to use environment variables:

1. Make the launcher script executable:
   ```bash
   chmod +x scripts/launch_servicenow_mcp.sh
   ```

2. Update your `mcp.json` (or copy from `mcp.json.template`):
   ```json
   "ServiceNow": {
     "command": "/Users/don/DocumentsMac/Codes/itsm-insight-nexus/scripts/launch_servicenow_mcp.sh",
     "args": [],
     "type": "stdio"
   }
   ```

3. The launcher script will automatically load variables from `.env` before starting the MCP server.

## Security Notes

- **Never commit `.env` file to git** - it's already in `.gitignore`
- The `mcp.json` template no longer contains hardcoded credentials
- All sensitive data is stored in `.env` file only
