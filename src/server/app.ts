/* eslint-disable import/prefer-default-export */
import passport from "@passport-next/passport";
import bodyParser from "body-parser";
import pgSession from "connect-pg-simple";
import cors from "cors";
import type { RequestHandler } from "express";
import express from "express";
import basicAuth from "express-basic-auth";
import expressSession from "express-session";

import { config } from "../config";
import correlationId from "../lib/correlation-id";
import requestLogging from "../lib/request-logging";
import logger from "../logger";
import { fulfillPendingRequestFor } from "./api/assignment";
import pgPool from "./db";
import { httpRequestDuration, httpRequestsTotal, registry } from "./metrics";
import appRenderer from "./middleware/app-renderer";
import { userLoggedIn } from "./models/cacheable_queries";
import {
  assembleRouter,
  authRouter,
  createGraphqlRouter,
  nexmoRouter,
  previewRouter,
  settingsRouter,
  telnyxRouter,
  twilioRouter,
  utilsRouter
} from "./routes";
import { errToObj } from "./utils";

const {
  PUBLIC_DIR,
  SESSION_SECRET,
  ASSIGNMENT_USERNAME,
  ASSIGNMENT_PASSWORD
} = config;

export const createApp = async () => {
  const app = express();

  // Prometheus metrics endpoint — must be before the HTTP instrumentation
  // middleware so the /metrics route itself isn't double-counted
  if (config.METRICS_ENABLED) {
    app.get("/metrics", async (_req, res) => {
      res.set("Content-Type", registry.contentType);
      res.end(await registry.metrics());
    });
  }

  // Instrument every request: record duration and total count by method/route/status
  app.use((req, res, next) => {
    const startNs = process.hrtime.bigint();
    res.on("finish", () => {
      const durationSeconds = Number(process.hrtime.bigint() - startNs) / 1e9;
      // req.route.path gives the matched route pattern (e.g. "/graphql"),
      // avoiding high-cardinality labels from path params like IDs
      const route: string = req.route?.path ?? "unmatched";
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode)
      };
      httpRequestDuration.observe(labels, durationSeconds);
      httpRequestsTotal.inc(labels);
    });
    next();
  });

  // Assign a correlation ID to every request before anything else logs
  app.use(correlationId);
  app.use(requestLogging);

  // Send version to client
  if (config.SPOKE_VERSION) {
    app.use((_req, res, next) => {
      res.setHeader("x-spoke-version", config.SPOKE_VERSION);
      next();
    });
  }

  const PgSession = pgSession(expressSession);

  app.enable("trust proxy"); // Don't rate limit heroku
  app.use(
    cors({
      origin: config.BASE_URL,
      preflightContinue: true,
      credentials: true
    })
  );
  app.options("*", cors());
  app.use(bodyParser.json({ limit: "50mb" }) as RequestHandler);
  app.use(bodyParser.urlencoded({ extended: true }) as RequestHandler);
  app.use(
    expressSession({
      secret: SESSION_SECRET,
      cookie: {
        httpOnly: true,
        secure: false, // config.isProduction,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      store: new PgSession({
        pool: pgPool,
        tableName: "user_session",
        createTableIfMissing: false,
        errorLog: (...args) => logger.error(...args),
        pruneSessionInterval: config.isTest ? false : 60
      }),
      resave: false,
      saveUninitialized: false
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(({ id }: { id: string }, done: any) => {
    done(null, id);
  });

  passport.deserializeUser((userId: any, done: any) =>
    userLoggedIn(userId, "id")
      .then((user: any) => done(null, user || false))
      .catch((error: any) => done(error))
  );

  if (PUBLIC_DIR) {
    app.use(express.static(PUBLIC_DIR, { maxAge: "180 days" }));
  }

  const graphqlRouter = await createGraphqlRouter();

  app.use(authRouter);
  app.use(graphqlRouter);
  app.use(nexmoRouter);
  app.use(twilioRouter);
  app.use(assembleRouter);
  app.use(telnyxRouter);
  app.use(utilsRouter);
  app.use(previewRouter);
  app.use(settingsRouter);

  app.post(
    "/autoassign",
    basicAuth({
      users: {
        [ASSIGNMENT_USERNAME]: ASSIGNMENT_PASSWORD
      }
    }),
    async (req, res) => {
      if (!req.body.slack_id)
        return res
          .status(400)
          .json({ error: "Missing parameter `slack_id` in POST body." });
      if (!req.body.count)
        return res
          .status(400)
          .json({ error: "Missing parameter `count` in POST body." });

      try {
        const numberAssigned = await fulfillPendingRequestFor(
          req.body.slack_id
        );
        return res.json({ numberAssigned });
      } catch (err: any) {
        logger.error("Error handling autoassignment request: ", err);
        return err.isFatal
          ? res.status(500).json({ error: err.message })
          : res.status(200).json({
              numberAssigned: 0,
              info: err.message
            });
      }
    }
  );

  // This middleware should be last. Return the React app only if no other route is hit.
  app.use(appRenderer);

  // Custom error handling
  const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    logger.warn("Unhandled express error: ", {
      error: errToObj(err),
      req
    });
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({ error: true });
  };
  app.use(errorHandler);

  return app;
};
