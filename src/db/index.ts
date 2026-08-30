import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import config from "../config/env";

import {
  users,
  admins,
  events,
  round,
  adminAccess,
  eventParticipation,
  participationGarbage,
  winners,
} from "./schema";

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 8, // Explicit limit — leaves room for Graphile Worker (~5 conns)

  ssl:
    config.NODE_ENV === "production"
      ? {
        rejectUnauthorized: false,
      }
      : false,
});

const db = drizzle(pool, {
  schema: {
    users,
    admins,
    events,
    round,
    adminAccess,
    eventParticipation,
    participationGarbage,
    winners,
  },
});

export { db, pool };
