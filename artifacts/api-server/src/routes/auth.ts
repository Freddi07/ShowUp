import { Router } from "express";
import { auth } from "../lib/auth";

const router = Router();

/**
 * Mount better-auth's handler for all /auth/* requests.
 * better-auth handles its own routing internally.
 */
router.all("/{*splat}", async (req, res) => {
  // Build a standard Request from the Express req
  const url = new URL(
    req.originalUrl,
    `${req.protocol}://${req.headers.host}`,
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  let body: string | undefined;
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    body = JSON.stringify(req.body);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  try {
    const response = await auth.handler(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("[auth] handler error:", err);
    res.status(500).json({ error: "Auth service error" });
  }
});

export default router;
