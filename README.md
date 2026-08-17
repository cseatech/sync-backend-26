# Sync Backend 26

This is the Express + Drizzle backend for the CSEA project. It provides authentication routes, role-based access control, and database access through PostgreSQL/Supabase.

## Prerequisites

Before starting, make sure you have:

- Node.js 18+ installed
- PostgreSQL database access or a Supabase project
- A `.env` file configured in the project root

## Environment Variables

Create a `.env` file in the backend root with DATABASE_URL and JWT_SECRET





## Install Dependencies

From the backend folder:

```bash
npm install
```

## Run the Server

### Development mode

```bash
npm run dev
```


The server will start on:

```bash
http://localhost:5000
```

## Drizzle Commands

### Open Drizzle Studio

```bash
npx drizzle-kit studio
```

This starts the Drizzle Studio UI in the browser so you can inspect the database schema and tables.

## API Base URL

```bash
/api/v1
```

Example login route:

```bash
POST /api/v1/auth/login
POST /api/v1/admin/login
```

## Project Structure

```bash
src/
  app.js
  server.js
  config/
  controllers/
  routes/
  services/
  middleware/
  db/
    schema.js
    index.js
```

## Notes

- `POST /api/v1/auth/login` is for normal users.
- `POST /api/v1/admin/login` is for admins.
- JWT-based authorization is used for protected routes.
- Ensure your database tables match the schema in `src/db/schema.js`.

## Troubleshooting

If the app fails to start:

1. Check that `.env` exists and is valid.
2. Confirm the `DATABASE_URL` is correct.
3. Run:

```bash
npm install
```

4. Restart the server:

```bash
npm run dev
```
