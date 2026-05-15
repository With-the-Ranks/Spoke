import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry
} from "prom-client";

import { config } from "../config";

export const registry = new Registry();
registry.setDefaultLabels({ client: config.CLIENT_LABEL });

// Collect Node.js runtime metrics (CPU, memory, event loop lag, GC, etc.)
collectDefaultMetrics({ register: registry });

// --- HTTP metrics ---

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [registry]
});

// --- GraphQL metrics ---

export const graphqlRequestDuration = new Histogram({
  name: "graphql_request_duration_seconds",
  help: "Duration of GraphQL requests in seconds",
  labelNames: ["operation_name", "operation_type"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

export const graphqlErrorsTotal = new Counter({
  name: "graphql_errors_total",
  help: "Total number of GraphQL errors",
  labelNames: ["operation_name", "error_type"],
  registers: [registry]
});

// --- SMS metrics ---
// Incremented by SMS provider integrations. Labels: status (success|error), provider (telnyx|twilio|nexmo)

export const smsSendTotal = new Counter({
  name: "spoke_sms_send_total",
  help: "Total number of SMS send attempts",
  labelNames: ["status", "provider"],
  registers: [registry]
});

// --- Worker metrics ---

export const workerTaskDuration = new Histogram({
  name: "worker_task_duration_seconds",
  help: "Duration of Graphile Worker task executions in seconds",
  labelNames: ["task_identifier", "status"],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [registry]
});

export const workerTaskTotal = new Counter({
  name: "worker_task_total",
  help: "Total number of Graphile Worker task executions",
  labelNames: ["task_identifier", "status"],
  registers: [registry]
});
