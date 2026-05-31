#!/usr/bin/env bash
# apply.sh — Push Spoke alert rules, contact points, and notification policy
#             to a Grafana Cloud instance via the HTTP API.
#
# Required environment variables:
#   GRAFANA_URL          e.g. https://yourstack.grafana.net  (no trailing slash)
#   GRAFANA_SA_TOKEN     Service account token with Admin role
#
# For contact points to work, also set:
#   ONCALL_WEBHOOK_URL   Grafana OnCall integration webhook URL (create a
#                        "Grafana Alerting" integration in OnCall to get this)
#   SLACK_WEBHOOK_URL    Incoming webhook URL for #alerts-spoke
#
# Usage:
#   export GRAFANA_URL=https://yourstack.grafana.net
#   export GRAFANA_SA_TOKEN=glsa_xxxxxxxxxxxx
#   export ONCALL_WEBHOOK_URL=https://oncall-prod-us-central-0.grafana.net/oncall/integrations/v1/grafana/...
#   export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
#   bash monitoring/grafana/apply.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
: "${GRAFANA_URL:?GRAFANA_URL is required}"
: "${GRAFANA_SA_TOKEN:?GRAFANA_SA_TOKEN is required}"

BASE="${GRAFANA_URL%/}"
AUTH="Authorization: Bearer ${GRAFANA_SA_TOKEN}"

grafana_curl() {
  local method="$1"; shift
  curl --silent --show-error --fail \
    -X "$method" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "→ Target: $BASE"

# ---------------------------------------------------------------------------
# 1. Create (or retrieve) the Spoke folder
# ---------------------------------------------------------------------------
echo "→ Ensuring 'Spoke' folder exists..."

FOLDER_RESPONSE=$(grafana_curl POST "$BASE/api/folders" \
  -d '{"title":"Spoke","uid":"spoke"}' 2>/dev/null \
  || grafana_curl GET "$BASE/api/folders/spoke")

FOLDER_UID=$(echo "$FOLDER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['uid'])")
echo "   Folder UID: $FOLDER_UID"

# ---------------------------------------------------------------------------
# 2. Detect Prometheus datasource UID
# ---------------------------------------------------------------------------
echo "→ Detecting Prometheus datasource UID..."

DS_RESPONSE=$(grafana_curl GET "$BASE/api/datasources")
PROMETHEUS_DS_UID=$(echo "$DS_RESPONSE" | python3 -c "
import sys, json
sources = json.load(sys.stdin)
prom = next(
    (s for s in sources if s.get('type') == 'prometheus'),
    None
)
if not prom:
    raise SystemExit('No Prometheus datasource found. Add one in Grafana Cloud first.')
print(prom['uid'])
")
echo "   Prometheus datasource UID: $PROMETHEUS_DS_UID"

# ---------------------------------------------------------------------------
# 3. Contact points
# ---------------------------------------------------------------------------
echo "→ Applying contact points..."

ONCALL_WEBHOOK_URL="${ONCALL_WEBHOOK_URL:-REPLACE_ME}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-REPLACE_ME}"

if [ "$ONCALL_WEBHOOK_URL" = "REPLACE_ME" ]; then
  echo "   ⚠  ONCALL_WEBHOOK_URL not set — oncall-critical will be scaffolded with a placeholder"
fi
if [ "$SLACK_WEBHOOK_URL" = "REPLACE_ME" ]; then
  echo "   ⚠  SLACK_WEBHOOK_URL not set — slack-warnings will be scaffolded with a placeholder"
fi

# Upsert a contact point: PUT to update if it exists, POST to create if not.
upsert_contact_point() {
  local uid="$1"
  local body="$2"
  local name="$3"
  if ! grafana_curl PUT "$BASE/api/v1/provisioning/contact-points/$uid" \
      -d "$body" > /dev/null 2>&1; then
    grafana_curl POST "$BASE/api/v1/provisioning/contact-points" \
      -d "$body" > /dev/null
  fi
  echo "   ✓ $name"
}

upsert_contact_point "oncall-critical-recv" "$(cat <<JSON
{
  "name": "oncall-critical",
  "type": "webhook",
  "uid": "oncall-critical-recv",
  "disableResolveMessage": false,
  "settings": {
    "url": "${ONCALL_WEBHOOK_URL}",
    "httpMethod": "POST",
    "maxAlerts": 0
  }
}
JSON
)" "oncall-critical"

upsert_contact_point "slack-warnings-recv" "$(cat <<JSON
{
  "name": "slack-warnings",
  "type": "slack",
  "uid": "slack-warnings-recv",
  "disableResolveMessage": true,
  "settings": {
    "url": "${SLACK_WEBHOOK_URL}",
    "channel": "#alerts-spoke",
    "username": "Grafana Alerts",
    "icon_emoji": ":grafana:",
    "title": "[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}",
    "text": "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"
  }
}
JSON
)" "slack-warnings"

# ---------------------------------------------------------------------------
# 4. Notification policy
# ---------------------------------------------------------------------------
echo "→ Applying notification policy..."

grafana_curl PUT "$BASE/api/v1/provisioning/policies" -d "$(cat <<'JSON'
{
  "receiver": "slack-warnings",
  "group_by": ["alertname", "environment"],
  "group_wait": "30s",
  "group_interval": "5m",
  "repeat_interval": "4h",
  "routes": [
    {
      "receiver": "oncall-critical",
      "matchers": ["severity = critical"],
      "group_wait": "10s",
      "group_interval": "1m",
      "repeat_interval": "1h",
      "continue": false
    },
    {
      "receiver": "slack-warnings",
      "matchers": ["severity = warning"],
      "group_wait": "1m",
      "group_interval": "5m",
      "repeat_interval": "8h",
      "continue": false
    }
  ]
}
JSON
)" > /dev/null
echo "   ✓ notification policy"

# ---------------------------------------------------------------------------
# 5. Alert rules
#
# Each group is posted to /api/ruler/grafana/api/v1/rules/{folderUID}.
# Posting a group replaces it entirely, making this idempotent.
# ---------------------------------------------------------------------------
echo "→ Applying alert rules..."

rule() {
  # Usage: rule <group-name> <JSON-body>
  local group="$1"
  local body="$2"
  local http_status response
  # Capture body + status without --fail so we can surface the API error.
  response=$(curl --silent \
    -X POST \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" \
    "$BASE/api/ruler/grafana/api/v1/rules/$FOLDER_UID" \
    -d "$body")
  http_status=$(echo "$response" | tail -n1)
  if [ "$http_status" -ge 400 ]; then
    echo "   ✗ $group → HTTP $http_status"
    echo "$response" | sed '$d'
    return 1
  fi
  echo "   ✓ $group"
}

# --- HTTP ---
rule "spoke-http" "$(cat <<JSON
{
  "name": "spoke-http",
  "interval": "1m",
  "rules": [
    {
      "grafana_alert": {
        "uid": "spoke-http-5xx",
        "title": "HTTP 5xx Error Rate High",
        "condition": "B",
        "no_data_state": "NoData",
        "exec_err_state": "Error",
        "missing_series_evals_to_resolve": 1,
        "data": [
          {
            "refId": "A",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "$PROMETHEUS_DS_UID",
            "model": {
              "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
              "instant": true,
              "refId": "A"
            }
          },
          {
            "refId": "B",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "-100",
            "model": {
              "type": "threshold",
              "refId": "B",
              "expression": "A",
              "conditions": [
                {
                  "evaluator": {"type": "gt", "params": [0.05]},
                  "operator": {"type": "and"},
                  "query": {"params": ["A"]},
                  "reducer": {"type": "last"},
                  "type": "query"
                }
              ]
            }
          }
        ]
      },
      "for": "5m",
      "keep_firing_for": "0s",
      "labels": {"severity": "critical", "team": "eng"},
      "annotations": {
        "summary": "HTTP 5xx error rate above 5%",
        "description": "The HTTP 5xx error rate is {{ \$values.A.Value | humanizePercentage }} over the last 5 minutes. Investigate application logs and recent deployments."
      }
    }
  ]
}
JSON
)"

# --- GraphQL ---
rule "spoke-graphql" "$(cat <<JSON
{
  "name": "spoke-graphql",
  "interval": "1m",
  "rules": [
    {
      "grafana_alert": {
        "uid": "spoke-gql-latency",
        "title": "GraphQL P95 Latency High",
        "condition": "B",
        "no_data_state": "NoData",
        "exec_err_state": "Error",
        "missing_series_evals_to_resolve": 1,
        "data": [
          {
            "refId": "A",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "$PROMETHEUS_DS_UID",
            "model": {
              "expr": "histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))",
              "instant": true,
              "refId": "A"
            }
          },
          {
            "refId": "B",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "-100",
            "model": {
              "type": "threshold",
              "refId": "B",
              "expression": "A",
              "conditions": [
                {
                  "evaluator": {"type": "gt", "params": [2]},
                  "operator": {"type": "and"},
                  "query": {"params": ["A"]},
                  "reducer": {"type": "last"},
                  "type": "query"
                }
              ]
            }
          }
        ]
      },
      "for": "5m",
      "keep_firing_for": "0s",
      "labels": {"severity": "critical", "team": "eng"},
      "annotations": {
        "summary": "GraphQL P95 latency above 2 s",
        "description": "The 95th-percentile GraphQL response time is {{ \$values.A.Value | humanizeDuration }} over the last 5 minutes. Check slow resolvers and database query times."
      }
    }
  ]
}
JSON
)"

# --- SMS ---
rule "spoke-sms" "$(cat <<JSON
{
  "name": "spoke-sms",
  "interval": "1m",
  "rules": [
    {
      "grafana_alert": {
        "uid": "spoke-sms-errors",
        "title": "SMS Send Error Rate High",
        "condition": "B",
        "no_data_state": "NoData",
        "exec_err_state": "Error",
        "missing_series_evals_to_resolve": 1,
        "data": [
          {
            "refId": "A",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "$PROMETHEUS_DS_UID",
            "model": {
              "expr": "(sum(rate(spoke_sms_send_total{status=\"error\"}[5m])) / sum(rate(spoke_sms_send_total[5m]))) and sum(rate(spoke_sms_send_total[5m])) > 0.016",
              "instant": true,
              "refId": "A"
            }
          },
          {
            "refId": "B",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "-100",
            "model": {
              "type": "threshold",
              "refId": "B",
              "expression": "A",
              "conditions": [
                {
                  "evaluator": {"type": "gt", "params": [0.05]},
                  "operator": {"type": "and"},
                  "query": {"params": ["A"]},
                  "reducer": {"type": "last"},
                  "type": "query"
                }
              ]
            }
          }
        ]
      },
      "for": "5m",
      "keep_firing_for": "0s",
      "labels": {"severity": "critical", "team": "eng"},
      "annotations": {
        "summary": "SMS send error rate above 5%",
        "description": "{{ \$values.A.Value | humanizePercentage }} of SMS sends are failing over the last 5 minutes. Check the Switchboard/Twilio/Nexmo status page and outbound webhook logs."
      }
    }
  ]
}
JSON
)"

# --- Worker ---
rule "spoke-worker" "$(cat <<JSON
{
  "name": "spoke-worker",
  "interval": "1m",
  "rules": [
    {
      "grafana_alert": {
        "uid": "spoke-worker-fail",
        "title": "Graphile Worker Task Failures",
        "condition": "B",
        "no_data_state": "OK",
        "exec_err_state": "OK",
        "missing_series_evals_to_resolve": 1,
        "data": [
          {
            "refId": "A",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "$PROMETHEUS_DS_UID",
            "model": {
              "expr": "sum by (task_identifier) (increase(worker_task_total{status=\"error\"}[5m]))",
              "instant": true,
              "refId": "A"
            }
          },
          {
            "refId": "B",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "-100",
            "model": {
              "type": "threshold",
              "refId": "B",
              "expression": "A",
              "conditions": [
                {
                  "evaluator": {"type": "gt", "params": [0]},
                  "operator": {"type": "and"},
                  "query": {"params": ["A"]},
                  "reducer": {"type": "last"},
                  "type": "query"
                }
              ]
            }
          }
        ]
      },
      "for": "5m",
      "keep_firing_for": "0s",
      "labels": {"severity": "warning", "team": "eng"},
      "annotations": {
        "summary": "Graphile Worker task failures detected",
        "description": "Task \"{{ \$labels.task_identifier }}\" has failed {{ \$values.A.Value }} time(s) in the last 5 minutes. Check worker logs and the graphile_worker.jobs table for error details."
      }
    }
  ]
}
JSON
)"

# --- Database ---
rule "spoke-database" "$(cat <<JSON
{
  "name": "spoke-database",
  "interval": "1m",
  "rules": [
    {
      "grafana_alert": {
        "uid": "spoke-db-pool",
        "title": "DB Connection Pool Saturation High",
        "condition": "B",
        "no_data_state": "NoData",
        "exec_err_state": "Error",
        "missing_series_evals_to_resolve": 1,
        "data": [
          {
            "refId": "A",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "$PROMETHEUS_DS_UID",
            "model": {
              "expr": "sum by (db) (db_pool_connections{state=\"active\"}) / (sum by (db) (db_pool_connections{state=\"active\"}) + sum by (db) (db_pool_connections{state=\"idle\"}))",
              "instant": true,
              "refId": "A"
            }
          },
          {
            "refId": "B",
            "relativeTimeRange": {"from": 300, "to": 0},
            "datasourceUid": "-100",
            "model": {
              "type": "threshold",
              "refId": "B",
              "expression": "A",
              "conditions": [
                {
                  "evaluator": {"type": "gt", "params": [0.80]},
                  "operator": {"type": "and"},
                  "query": {"params": ["A"]},
                  "reducer": {"type": "last"},
                  "type": "query"
                }
              ]
            }
          }
        ]
      },
      "for": "5m",
      "keep_firing_for": "0s",
      "labels": {"severity": "critical", "team": "eng"},
      "annotations": {
        "summary": "DB connection pool above 80% utilized",
        "description": "The {{ \$labels.db }} Postgres connection pool is {{ \$values.A.Value | humanizePercentage }} utilized for the last 5 minutes. Consider increasing DB_MAX_POOL or investigating long-running queries."
      }
    }
  ]
}
JSON
)"

echo ""
echo "✓ All done. Open $BASE/alerting/list to verify."
