const winston = require("winston");
const { trace } = require("@opentelemetry/api");

const { config } = require("./config");

// Stamps traceId + spanId onto every log entry when there is an active OTEL span.
// When OTEL is disabled the global tracer is a no-op and getActiveSpan() returns
// undefined, so this is always safe to include.
const traceContextFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span?.isRecording()) {
    const { traceId, spanId } = span.spanContext();
    info.traceId = traceId;
    info.spanId = spanId;
  }
  return info;
})();

// Winston configuration
const logger = winston.createLogger({
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      level: config.LOG_LEVEL,
      format: winston.format.combine(
        traceContextFormat,
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

/**
 * Create a child logger pre-stamped with request/domain context fields.
 * Every log call on the returned logger will include the provided fields,
 * making it easy to correlate log lines across a single request or task.
 *
 * @param {object} ctx
 * @param {string} [ctx.requestId]     - Correlation ID for the HTTP request
 * @param {string} [ctx.userId]        - Authenticated user ID
 * @param {string} [ctx.organizationId]
 * @param {string} [ctx.campaignId]
 *
 * @example
 * const log = childLogger({ requestId, userId: user.id });
 * log.info("sendMessage called", { contactId });
 */
const childLogger = (ctx) => logger.child(ctx);

module.exports = logger;
module.exports.childLogger = childLogger;
