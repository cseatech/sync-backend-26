import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth/auth.routes";
import adminRoutes from "./routes/admin/admin.routes";
import eventsPublicRoutes from "./routes/events/events.public.routes";
import eventsAdminRoutes from "./routes/events/events.admin.routes";
import eventsSuperadminRoutes from "./routes/events/events.superadmin.routes";
import certificateAdminRoutes from "./routes/certificate/certificate.admin.routes";
import certificatePublicRoutes from "./routes/certificate/certificate.public.routes";



import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app = express();

// ── Helmet: lightweight security headers ─────────────────────
// - CSP disabled to avoid breaking the frontend
// - X-Frame-Options: DENY prevents clickjacking
// - X-Content-Type-Options prevents MIME sniffing
// - X-Powered-By header stripped
app.use(
  helmet({
    contentSecurityPolicy: false,
    xFrameOptions: { action: "deny" },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(morgan("dev"));

app.use(
  express.json({
    limit: "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
  });
});

app.use("/api/v1", authRoutes);

// ── Load-test routes (no rate limiter) — NEVER in production ──
// MUST be mounted before routers that use router.use(protect), otherwise
// Express 5 short-circuits with 401 before reaching the test router.
import testRoutes from "./routes/auth/test.routes.js";
if (process.env.NODE_ENV !== "production") {
  app.use("/api/v1", testRoutes);
  console.log("🧪 Test routes mounted at /api/v1/test/*");
}

app.use("/api/v1", adminRoutes);
app.use("/api/v1", eventsPublicRoutes);
app.use("/api/v1", eventsAdminRoutes);
app.use("/api/v1", eventsSuperadminRoutes);
app.use("/api/v1", certificateAdminRoutes);
app.use("/api/v1", certificatePublicRoutes);


app.use(notFoundHandler);
app.use(errorHandler);

export default app;
