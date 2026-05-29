import type { Knex } from "knex";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry
} from "prom-client";

import { config } from "../config";

export const registry = new Registry();
registry.setDefaultLabels({ environment: config.DEPLOY_ENVIRONMENT });

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
// Incremented by SMS provider integrations. Labels: status (success|error), provider (switchboard|twilio|nexmo)

export const smsSendTotal = new Counter({
  name: "spoke_sms_send_total",
  help: "Total number of SMS send attempts",
  labelNames: ["status", "provider"],
  registers: [registry]
});

// --- Auth metrics ---

export const authAttemptsTotal = new Counter({
  name: "auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["strategy", "status"],
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

// --- Database metrics ---

export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "db"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry]
});

export const dbPoolConnections = new Gauge({
  name: "db_pool_connections",
  help: "Current number of database pool connections by state",
  labelNames: ["db", "state"],
  registers: [registry]
});

const detectOperation = (sql: string): string => {
  const prefix = sql.trimStart().toLowerCase().slice(0, 6);
  if (prefix === "select") return "select";
  if (prefix === "insert") return "insert";
  if (prefix === "update") return "update";
  if (prefix === "delete") return "delete";
  return "other";
};

/**
 * Attach Knex query-event listeners and a pool-polling interval to feed
 * db_query_duration_seconds and db_pool_connections for the given instance.
 */
export const instrumentKnex = (
  knexInstance: Knex,
  label: "primary" | "reader"
) => {
  const queryStartTimes = new Map<string, number>();

  knexInstance.on("query", (data: any) => {
    queryStartTimes.set(data.__knexQueryUid, Date.now());
  });

  knexInstance.on("query-response", (_response: any, data: any) => {
    const start = queryStartTimes.get(data.__knexQueryUid);
    if (start !== undefined) {
      dbQueryDuration.observe(
        { operation: detectOperation(data.sql), db: label },
        (Date.now() - start) / 1000
      );
      queryStartTimes.delete(data.__knexQueryUid);
    }
  });

  knexInstance.on("query-error", (_error: any, data: any) => {
    queryStartTimes.delete(data.__knexQueryUid);
  });

  // tarn.js (Knex's pool) doesn't emit events, so poll every 15 s.
  // .unref() prevents the interval from keeping the process alive.
  setInterval(() => {
    const { pool } = knexInstance.client as any;
    if (pool) {
      dbPoolConnections.set({ db: label, state: "active" }, pool.numUsed());
      dbPoolConnections.set({ db: label, state: "idle" }, pool.numFree());
      dbPoolConnections.set(
        { db: label, state: "pending" },
        pool.numPendingAcquires()
      );
    }
  }, 15_000).unref();
};
