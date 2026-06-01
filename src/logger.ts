import winston from "winston";

import { config } from "./config";

interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  campaignId?: string;
}

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

export const childLogger = (ctx: LogContext) => logger.child(ctx);

export default logger;
