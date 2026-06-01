import expressWinston from "express-winston";

import logger from "../logger";

expressWinston.requestWhitelist.push("body");

export default expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: (_req, _res) => false,
  // Attach the correlation ID from the current request to every log line
  dynamicMeta: (_req, res) => ({
    requestId: res.locals.requestId
  })
});
