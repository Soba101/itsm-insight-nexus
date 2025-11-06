#!/bin/bash
# Test ServiceNow REST API to get full incident details

INSTANCE_URL="https://dev355928.service-now.com"
USERNAME="admin"
PASSWORD='mMc!ZK+8x9Un'
INCIDENT_NUMBER="INC0010054"

# Get incident by number (query parameter)
curl -X GET "${INSTANCE_URL}/api/now/table/incident?sysparm_query=number=${INCIDENT_NUMBER}&sysparm_display_value=true&sysparm_fields=number,sys_id,short_description,description,state,priority,impact,urgency,caller_id,assigned_to,assignment_group,category,subcategory,sys_created_on,sys_updated_on" \
  -H "Accept: application/json" \
  -u "${USERNAME}:${PASSWORD}" \
  2>/dev/null | python3 -m json.tool
