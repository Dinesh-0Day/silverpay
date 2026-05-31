import "dotenv/config";
import express from "express";
import cors from "cors";
import { UPLOADS_DIR } from "./lib/upload.js";
import { connectDB } from "./lib/db.js";
import { bootstrapAdminIfEmpty } from "./lib/bootstrap.js";
import { assertSecurityConfig, getCorsOrigins } from "./lib/security.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { adminRouter } from "./routes/admin.js";
import { webhooksRouter } from "./routes/webhooks.js";

if (process.env.NODE_ENV === "production") {
  assertSecurityConfig();
}

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
app.use(cors({ origin: getCorsOrigins(), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/webhooks", webhooksRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  }
);

connectDB()
  .then(() => bootstrapAdminIfEmpty())
  .then(() => {
    app.listen(port, () => {
      console.log(`SilverPay API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
