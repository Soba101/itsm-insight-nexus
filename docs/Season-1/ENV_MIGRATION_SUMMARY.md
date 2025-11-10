# Environment Configuration Migration

**Date:** 6 November 2025
**Status:** ✅ Complete

## Summary

Updated Python scripts to use environment variables from `.env` file instead of hardcoded credentials.

## Changes Made

### 1. Updated `.env` File

Added proper database configuration variables:

```env
# PostgreSQL Database Configuration (Docker)
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="itsm_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
```

### 2. Updated `scripts/fetch_servicenow_incidents.py`

- ✅ Added `python-dotenv` import
- ✅ Load `.env` file from project root
- ✅ Read `SERVICENOW_INSTANCE_URL`, `SERVICENOW_USERNAME`, `SERVICENOW_PASSWORD` from environment
- ✅ Added validation to check for missing configuration
- ✅ Dynamic API endpoint construction

**Before:**

```python
INSTANCE_URL = "https://dev305874.service-now.com/"
USERNAME = "admin"
PASSWORD = "Sbg2A+Rp8By*"
```

**After:**

```python
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

INSTANCE_URL = os.getenv('SERVICENOW_INSTANCE_URL')
USERNAME = os.getenv('SERVICENOW_USERNAME')
PASSWORD = os.getenv('SERVICENOW_PASSWORD')
```

### 3. Updated `scripts/insert_servicenow_incidents.py`

- ✅ Added `python-dotenv` import
- ✅ Load `.env` file from project root
- ✅ Read database config from environment variables with defaults
- ✅ Supports: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Before:**

```python
DB_CONFIG = {
    "host": "localhost",
    "port": 15432,
    "database": "itsm_db",
    "user": "postgres",
    "password": "postgres"
}
```

**After:**

```python
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DB_CONFIG = {
    "host": os.getenv('DB_HOST', 'localhost'),
    "port": int(os.getenv('DB_PORT', '15432')),
    "database": os.getenv('DB_NAME', 'itsm_db'),
    "user": os.getenv('DB_USER', 'postgres'),
    "password": os.getenv('DB_PASSWORD', 'postgres')
}
```

### 4. Created `scripts/requirements.txt`

Added necessary Python dependencies:

```txt
requests>=2.31.0
psycopg2-binary>=2.9.9
python-dotenv>=1.0.0
```

## Installation

Install dependencies in the conda environment:

```bash
conda activate itsm
pip install -r scripts/requirements.txt
```

## Usage

### Fetch Incidents from ServiceNow

```bash
conda activate itsm
python3 scripts/fetch_servicenow_incidents.py > data/servicenow_incidents_full.json
```

### Insert Incidents into PostgreSQL

```bash
conda activate itsm
python3 scripts/insert_servicenow_incidents.py
```

## Benefits

1. **Security:** No hardcoded credentials in source code
2. **Flexibility:** Easy to change configuration without editing scripts
3. **Environment-specific:** Can use different `.env` files for dev/staging/prod
4. **Version Control Safe:** `.env` file in `.gitignore`, credentials not committed
5. **Validation:** Scripts check for missing required configuration
6. **Defaults:** Database settings have sensible defaults

## Configuration Variables

### Required (ServiceNow)

- `SERVICENOW_INSTANCE_URL` - Your ServiceNow instance URL
- `SERVICENOW_USERNAME` - ServiceNow API username
- `SERVICENOW_PASSWORD` - ServiceNow API password

### Optional (Database - with defaults)

- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `15432`)
- `DB_NAME` - Database name (default: `itsm_db`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)

## Testing

Both scripts have been syntax-checked and are ready to use:

```bash
✅ scripts/fetch_servicenow_incidents.py - No syntax errors
✅ scripts/insert_servicenow_incidents.py - No syntax errors
```

## Next Steps

To test the scripts:

1. Install dependencies: `pip install -r scripts/requirements.txt`
2. Verify `.env` file has correct credentials
3. Run fetch script: `python3 scripts/fetch_servicenow_incidents.py`
4. Run insert script (if needed): `python3 scripts/insert_servicenow_incidents.py`
