const winston = require("winston");

const { config } = require("./config");

// Winston configuration
const logger = winston.createLogger({
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      level: config.LOG_LEVEL,
      format: winston.format.combine(
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
