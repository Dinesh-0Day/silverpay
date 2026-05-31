import type { Express, Request, Response, NextFunction } from "express";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.ip;
  return ip ?? "unknown";
}

/** Simple in-memory rate limit for auth routes (per IP). */
export function authRateLimit(max = 10, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req);
    const now = Date.now();
    let entry = loginAttempts.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      loginAttempts.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({ error: "Too many attempts. Try again later." });
      return;
    }
    next();
  };
}

export function assertSecurityConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters.");
  }
}

export function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CORS_ORIGINS must be set in production (comma-separated).");
    }
    return true;
  }
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}
