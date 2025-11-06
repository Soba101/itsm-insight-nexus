#!/usr/bin/env python3
"""
Insert ServiceNow incidents from JSON into PostgreSQL
Reads servicenow_incidents_full.json and inserts into Docker Postgres
"""

import json
import sys
import os
import psycopg2
from psycopg2 import sql
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Read database configuration from environment
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT')
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')

# Validate database configuration
if not all([db_host, db_port, db_name, db_user, db_password]):
    print("Error: Missing database configuration in .env file", file=sys.stderr)
    print("Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD", file=sys.stderr)
    sys.exit(1)

# Database configuration (validated above, safe to use)
DB_CONFIG = {
    "host": db_host,
    "port": int(db_port),  # type: ignore
    "database": db_name,
    "user": db_user,
    "password": db_password
}

def extract_priority_number(priority_str: str) -> str:
    """Extract just the number from priority string like '3 - Moderate' -> '3'"""
    if not priority_str:
        return ""
    return priority_str.split(" ")[0] if " " in priority_str else priority_str

def extract_impact_number(impact_str: str) -> str:
    """Extract just the number from impact string like '2 - Medium' -> '2'"""
    if not impact_str:
        return ""
    return impact_str.split(" ")[0] if " " in impact_str else impact_str

def extract_urgency_number(urgency_str: str) -> str:
    """Extract just the number from urgency string like '2 - Medium' -> '2'"""
    if not urgency_str:
        return ""
    return urgency_str.split(" ")[0] if " " in urgency_str else urgency_str

def load_incidents(filename: str) -> list:
    """Load incidents from JSON file"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON file: {e}", file=sys.stderr)
        sys.exit(1)

def insert_incidents(incidents: list):
    """Insert incidents into PostgreSQL"""
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        insert_query = """
        INSERT INTO servicenow_incidents (
            sys_id, incident_number, short_description, description,
            state, priority, impact, urgency,
            caller_id, assigned_to, assignment_group,
            category, subcategory,
            sys_created_on, sys_updated_on, sys_created_by, sys_updated_by,
            opened_at, resolved_at, closed_at,
            close_code, close_notes, resolution_code, resolution_notes,
            work_notes, comments_and_work_notes,
            business_service, cmdb_ci
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        inserted_count = 0
        for incident in incidents:
            # Prepare values, converting empty strings to NULL
            values = (
                incident['sys_id'] or None,
                incident['incident_number'] or None,
                incident['short_description'] or None,
                incident['description'] or None,
                incident['state'] or None,
                extract_priority_number(incident['priority']) or None,
                extract_impact_number(incident['impact']) or None,
                extract_urgency_number(incident['urgency']) or None,
                incident['caller_id'] or None,
                incident['assigned_to'] or None,
                incident['assignment_group'] or None,
                incident['category'] or None,
                incident['subcategory'] or None,
                incident['sys_created_on'] or None,
                incident['sys_updated_on'] or None,
                incident['sys_created_by'] or None,
                incident['sys_updated_by'] or None,
                incident['opened_at'] or None,
                incident['resolved_at'] or None,
                incident['closed_at'] or None,
                incident['close_code'] or None,
                incident['close_notes'] or None,
                incident['resolution_code'] or None,
                incident['resolution_notes'] or None,
                incident['work_notes'] or None,
                incident['comments'] or None,
                incident['business_service'] or None,
                incident['cmdb_ci'] or None
            )
            
            try:
                cursor.execute(insert_query, values)
                inserted_count += 1
            except Exception as e:
                print(f"Error inserting incident {incident['incident_number']}: {e}", file=sys.stderr)
                continue
        
        # Commit transaction
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"Successfully inserted {inserted_count} incidents into database")
        return inserted_count
        
    except Exception as e:
        print(f"Database error: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main execution"""
    filename = "servicenow_incidents_full.json"
    
    print(f"Loading incidents from {filename}...")
    incidents = load_incidents(filename)
    print(f"Loaded {len(incidents)} incidents")
    
    print("Inserting incidents into PostgreSQL...")
    insert_incidents(incidents)

if __name__ == "__main__":
    main()
