import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { userRoutes } from "./routes/userRoutes.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/users", userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error",
    syncStep: err.syncStep ?? null,
    detail: err.message,
  });
});

app.listen(env.port, () => {
  console.log(`[server] Robowar backend listening on port ${env.port}`);
});
