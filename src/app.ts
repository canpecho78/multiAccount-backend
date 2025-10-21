import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import { metricsRegister } from "./metrics/metrics";
import { verifyJWT, requireRoles } from "./middleware/auth";
import sessionRoutes from "./routes/sessionRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes";
import roleRoutes from "./routes/roleRoutes";
import userRoutes from "./routes/userRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import adminRoutes from "./routes/adminRoutes";
import sessionStatsRoutes from "./routes/sessionStats";
import mediaRoutes from "./routes/mediaRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import contactRoutes from "./routes/contactRoutes";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "🚀 API WhatsApp Multi-sesiones con MongoDB",
    status: "running",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Prometheus metrics (protegido - solo administrador)
app.get("/metrics", verifyJWT, requireRoles("administrator"), async (_req, res) => {
  res.set("Content-Type", metricsRegister.contentType);
  res.send(await metricsRegister.metrics());
});

// Swagger
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes base
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/sessions", chatRoutes);
app.use("/api/sessions", messageRoutes);
app.use("/api/sessions", assignmentRoutes);
app.use("/api/sessions", sessionStatsRoutes);

// Media routes
app.use("/api/media", mediaRoutes);

// Employee routes
app.use("/api/employee", employeeRoutes);

// Contacts routes
app.use("/api/contacts", contactRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

export default app;
