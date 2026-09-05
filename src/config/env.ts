import "dotenv/config";

const PORT = Number(process.env.PORT || 5000);

const DATABASE_URL = process.env.DATABASE_URL;
const WORKER_DATABASE_URL = process.env.WORKER_DATABASE_URL;

const NODE_ENV = process.env.NODE_ENV || "development";

// SMTP configuration (optional — when absent, emails are logged to console)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@symposium.com";

export const config = {
  PORT,
  DATABASE_URL,
  WORKER_DATABASE_URL,
  NODE_ENV,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
};

export default config;