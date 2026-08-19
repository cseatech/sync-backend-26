import "dotenv/config";

const PORT = Number(process.env.PORT || 5000);

const DATABASE_URL = process.env.DATABASE_URL;

const NODE_ENV = process.env.NODE_ENV || "development";

export const config = {
  PORT,
  DATABASE_URL,
  NODE_ENV,
};

export default config;