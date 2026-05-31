import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";

export type JwtUser = { sub: string; role: "user" | "admin"; uid?: string };
export type AuthRequest = Request & { user?: JwtUser };

export function signToken(payload: JwtUser): string {
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtUser {
  return jwt.verify(token, secret) as JwtUser;
}

export function requireAuth(role?: "user" | "admin") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const user = verifyToken(header.slice(7));
      if (role && user.role !== role) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };
}
