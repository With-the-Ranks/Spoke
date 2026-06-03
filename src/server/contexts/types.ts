import type { Knex } from "knex";
import type { Memoizer } from "memoredis";

export interface SpokeDbContext {
  schema: string;
  primary: Knex;
  reader: Knex;
}

export interface SpokeContext {
  db: SpokeDbContext;
  memoizer: Memoizer;
}

export interface SpokeRequestContext extends SpokeContext {
  user: any;
  loaders: any;
  /** Correlation ID for the current HTTP request, set by the correlationId middleware. */
  requestId: string | undefined;
}
