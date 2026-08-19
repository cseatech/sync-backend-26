const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./Routes/auth/auth.routes");
const adminRoutes = require("./Routes/admin/admin.routes");
const eventsPublicRoutes = require("./Routes/events/events.public.routes");
const eventsAdminRoutes = require("./Routes/events/events.admin.routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Backend is healthy" });
});

app.use("/api/v1", authRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", eventsPublicRoutes);
app.use("/api/v1", eventsAdminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
