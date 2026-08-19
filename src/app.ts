import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth/auth.routes";
import adminRoutes from "./routes/admin/admin.routes";
import eventsPublicRoutes from "./routes/events/events.public.routes";
import eventsAdminRoutes from "./routes/events/events.admin.routes";

import {
  notFoundHandler,
  errorHandler,
} from "./middleware/errorHandler";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(morgan("dev"));

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is healthy",
  });
});

app.use("/api/v1", authRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", eventsPublicRoutes);
app.use("/api/v1", eventsAdminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;