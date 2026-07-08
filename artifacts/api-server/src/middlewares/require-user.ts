import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role?: string | null };
    }
  }
}

/** Convert Express headers into a web-standard Headers object for better-auth. */
export function toWebHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

/** Require an authenticated user; attaches req.user or responds 401. */
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: toWebHeaders(req) });
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: (session.user as { role?: string | null }).role ?? null,
    };
    next();
  } catch (err) {
    console.error("[auth] requireUser error:", err);
    res.status(500).json({ error: "Auth service error" });
  }
}

/** Require an authenticated admin user. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireUser(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

/**
 * Allowlist of emails permitted to access the admin dashboard.
 * Defaults to a single owner email; override with ADMIN_EMAILS (comma-separated).
 */
export const ADMIN_EMAILS: string[] = (
  process.env.ADMIN_EMAILS ?? "snillefredrik@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Require an authenticated user whose email is on the admin allowlist. */
export async function requireAdminEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireUser(req, res, () => {
    if (!isAdminEmail(req.user?.email)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}
