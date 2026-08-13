const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const config = require("../config/env");
const { users } = require("./schema");

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool, {
  schema: { users },
});

module.exports = { db, pool };
