import type { Request, Response } from "express";
import expressWinston from "express-winston";
import winston from "winston";

import { config } from "../config";

expressWinston.requestWhitelist.push("body");

export default expressWinston.logger({
  transports: [
    config.LOGGING_MONGODB_URI
      ? new winston.transports.MongoDB({
          db: config.LOGGING_MONGODB_URI
        })
      : new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: (_req: Request, _res: Response) => false
});
