/* eslint-disable import/prefer-default-export */
import { ApolloArmor } from "@escape.tech/graphql-armor";
import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { ApolloError, ApolloServer } from "apollo-server-express";
import type { ApolloServerPlugin } from "apollo-server-plugin-base";
import express from "express";
import type { OperationDefinitionNode } from "graphql";
import { Kind } from "graphql";
import { graphqlUploadExpress } from "graphql-upload";

import { schema } from "../../../libs/gql-schema/schema";
import { config } from "../../config";
import logger from "../../logger";
import mocks from "../api/mocks";
import { resolvers } from "../api/schema";
import { contextForRequest } from "../contexts";
import { graphqlErrorsTotal, graphqlRequestDuration } from "../metrics";

const metricsPlugin: ApolloServerPlugin = {
  requestDidStart: async () => {
    const startNs = process.hrtime.bigint();
    let operationType = "unknown";

    return {
      executionDidStart: async ({ document }) => {
        const opDef = document.definitions.find(
          (d): d is OperationDefinitionNode =>
            d.kind === Kind.OPERATION_DEFINITION
        );
        operationType = opDef?.operation ?? "unknown";
      },
      willSendResponse: async ({ request }) => {
        const durationSeconds = Number(process.hrtime.bigint() - startNs) / 1e9;
        graphqlRequestDuration.observe(
          {
            operation_name: request.operationName ?? "anonymous",
            operation_type: operationType
          },
          durationSeconds
        );
      },
      didEncounterErrors: async ({ request, errors }) => {
        for (const error of errors) {
          graphqlErrorsTotal.inc({
            operation_name: request.operationName ?? "anonymous",
            error_type: String(error.extensions?.code ?? "UNKNOWN")
          });
        }
      }
    };
  }
};

export const createRouter = async () => {
  const router = express();

  const executableSchema = makeExecutableSchema({
    typeDefs: schema,
    resolvers
  });

  const schemaWithMocks = addMocksToSchema({
    schema: executableSchema,
    mocks,
    resolvers,
    preserveResolvers: true
  });

  const formatError = (err: any) => {
    // Ignore intentional ApolloErrors
    if (err.originalError instanceof ApolloError) {
      return err;
    }

    // node-postgres does not use an Error subclass so we check for schema property
    const hasSchema = Object.prototype.hasOwnProperty.call(
      err.originalError,
      "schema"
    );

    if (hasSchema && config.isProduction) {
      logger.error("Postgres error: ", err);
      return new Error("Internal server error");
    }

    logger.error("GraphQL error: ", err);
    return err;
  };

  const armor = new ApolloArmor({
    maxDepth: {
      n: 10
    }
  });
  const protection = armor.protect();

  const plugins = config.isProduction
    ? [metricsPlugin]
    : [ApolloServerPluginLandingPageGraphQLPlayground(), metricsPlugin];

  const server = new ApolloServer({
    schema: schemaWithMocks,
    formatError,
    debug: !config.isProduction,
    introspection: !config.isProduction,
    ...protection,
    plugins: [...protection.plugins, ...plugins],
    context: async ({ req }) => contextForRequest(req)
  });

  await server.start();

  router.use(
    graphqlUploadExpress({
      maxFileSize: 50 * 1000 * 1000, // 50 MB
      maxFiles: 20
    })
  );
  router.use(server.getMiddleware({ path: "/graphql" }));

  return router;
};
