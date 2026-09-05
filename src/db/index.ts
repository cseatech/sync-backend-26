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
  max: 200, // Massive concurrency unlocked because we use the Transaction Pooler!

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
