import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * Express middleware that assigns a unique requestId to every inbound request.
 *
 * - If the upstream caller supplies an X-Request-Id header, that value is
 *   reused so the correlation ID flows across service boundaries.
 * - Otherwise a new random ID is generated via crypto.randomUUID().
 *
 * The ID is stored on res.locals.requestId so that downstream middleware,
 * GraphQL resolvers, and worker tasks can attach it to log entries.
 * It is also echoed back in the X-Request-Id response header so callers
 * can correlate requests in their own logs.
 */
const correlationId = (req: Request, res: Response, next: NextFunction) => {
  const requestId =
    (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined) ??
    randomUUID();

  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};

export default correlationId;
