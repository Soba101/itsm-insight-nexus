#!/usr/bin/env python3
"""
ServiceNow REST API - Fetch Incidents with Complete Fields
Fetches incidents from ServiceNow using Table API with all fields including:
caller_id, assignment_group, impact, urgency, etc.
"""

import requests
import json
import sys
from typing import Dict, List, Any

# ServiceNow Configuration
INSTANCE_URL = "https://dev305874.service-now.com/"
USERNAME = "admin"
PASSWORD = "Sbg2A+Rp8By*"
API_ENDPOINT = f"{INSTANCE_URL}/api/now/table/incident"

# Fields to retrieve
FIELDS = [
    "number",
    "sys_id",
    "short_description",
    "description",
    "state",
    "priority",
    "impact",
    "urgency",
    "caller_id",
    "assigned_to",
    "assignment_group",
    "category",
    "subcategory",
    "sys_created_on",
    "sys_updated_on",
    "sys_created_by",
    "sys_updated_by",
    "opened_at",
    "resolved_at",
    "closed_at",
    "close_code",
    "close_notes",
    "resolution_code",
    "resolution_notes",
    "work_notes",
    "comments",
    "business_service",
    "cmdb_ci"
]

def fetch_incidents(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """
    Fetch incidents from ServiceNow Table API
    
    Args:
        limit: Maximum number of records to return
        offset: Starting record number for pagination
    
    Returns:
        Dict containing incidents data
    """
    params = {
        "sysparm_display_value": "true",  # Get display values for reference fields
        "sysparm_fields": ",".join(FIELDS),
        "sysparm_limit": limit,
        "sysparm_offset": offset,
        "sysparm_query": "ORDERBYDESCsys_created_on"  # Order by newest first
    }
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            API_ENDPOINT,
            params=params,
            headers=headers,
            auth=(USERNAME, PASSWORD),
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching incidents: {e}", file=sys.stderr)
        sys.exit(1)

def extract_display_value(field_value: Any) -> str:
    """
    Extract display value from ServiceNow reference fields
    
    Args:
        field_value: Field value (can be string or dict with display_value)
    
    Returns:
        String value or empty string
    """
    if field_value is None:
        return ""
    if isinstance(field_value, dict):
        return field_value.get("display_value", "")
    return str(field_value)

def parse_incidents(raw_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Parse incidents from ServiceNow response
    
    Args:
        raw_data: Raw JSON response from ServiceNow
    
    Returns:
        List of parsed incident dictionaries
    """
    incidents = []
    
    for record in raw_data.get("result", []):
        incident = {
            "sys_id": extract_display_value(record.get("sys_id")),
            "incident_number": extract_display_value(record.get("number")),
            "short_description": extract_display_value(record.get("short_description")),
            "description": extract_display_value(record.get("description")),
            "state": extract_display_value(record.get("state")),
            "priority": extract_display_value(record.get("priority")),
            "impact": extract_display_value(record.get("impact")),
            "urgency": extract_display_value(record.get("urgency")),
            "caller_id": extract_display_value(record.get("caller_id")),
            "assigned_to": extract_display_value(record.get("assigned_to")),
            "assignment_group": extract_display_value(record.get("assignment_group")),
            "category": extract_display_value(record.get("category")),
            "subcategory": extract_display_value(record.get("subcategory")),
            "sys_created_on": extract_display_value(record.get("sys_created_on")),
            "sys_updated_on": extract_display_value(record.get("sys_updated_on")),
            "sys_created_by": extract_display_value(record.get("sys_created_by")),
            "sys_updated_by": extract_display_value(record.get("sys_updated_by")),
            "opened_at": extract_display_value(record.get("opened_at")),
            "resolved_at": extract_display_value(record.get("resolved_at")),
            "closed_at": extract_display_value(record.get("closed_at")),
            "close_code": extract_display_value(record.get("close_code")),
            "close_notes": extract_display_value(record.get("close_notes")),
            "resolution_code": extract_display_value(record.get("resolution_code")),
            "resolution_notes": extract_display_value(record.get("resolution_notes")),
            "work_notes": extract_display_value(record.get("work_notes")),
            "comments": extract_display_value(record.get("comments")),
            "business_service": extract_display_value(record.get("business_service")),
            "cmdb_ci": extract_display_value(record.get("cmdb_ci"))
        }
        incidents.append(incident)
    
    return incidents

def main():
    """Main execution function"""
    print("Fetching incidents from ServiceNow REST API...", file=sys.stderr)
    
    # Fetch incidents (max 100 for now)
    raw_data = fetch_incidents(limit=100, offset=0)
    
    # Parse incidents
    incidents = parse_incidents(raw_data)
    
    print(f"Successfully fetched {len(incidents)} incidents", file=sys.stderr)
    
    # Output as JSON
    print(json.dumps(incidents, indent=2))

if __name__ == "__main__":
    main()
