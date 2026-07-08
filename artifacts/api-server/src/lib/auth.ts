import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import { db } from "@workspace/db";
import {
  userTable,
  sessionTable,
  accountTable,
  verificationTable,
} from "@workspace/db/schema";
import { dispatchEmail, passwordResetEmail, welcomeEmail } from "./email";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_SECRET must be set in production. Generate one with: openssl rand -base64 32",
    );
  }
  console.warn(
    "[auth] BETTER_AUTH_SECRET not set — using insecure dev fallback. Set this env var before deploying.",
  );
}

// Frontend origin — reset links point at the Vite app's /reset-password page.
// Frontend and API share the same host via Replit's path-based proxy.
const APP_URL =
  process.env.APP_URL ??
  process.env.BETTER_AUTH_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.PORT ?? 3001}`);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
    },
  }),
  secret: BETTER_AUTH_SECRET ?? "insecure-dev-secret-do-not-use-in-prod-aaa",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : null) ??
    `http://localhost:${process.env.PORT ?? 3001}`,
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.REPLIT_DEV_DOMAIN
      ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
      : []),
    // The Expo mobile app (web build + native) is served from a separate
    // Replit domain and authenticates cross-origin, so trust it explicitly.
    ...(process.env.REPLIT_EXPO_DEV_DOMAIN
      ? [`https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`]
      : []),
    // Replit dev/preview and deployed domains (wildcards) so the mobile app
    // works across sessions and in production.
    "https://*.replit.dev",
    "https://*.spock.replit.dev",
    "https://*.replit.app",
    "http://localhost:3000",
    "http://localhost:20192",
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      const name = user.name || user.email.split("@")[0];
      dispatchEmail({
        to: user.email,
        context: "password-reset",
        ...passwordResetEmail({ name, resetUrl }),
      });
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    // Enables `Authorization: Bearer <token>` auth so the Expo mobile app
    // can authenticate with the same session backend as the web app.
    bearer(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Provision a 14-day trial profile for every new user.
          try {
            const { userProfileTable } = await import("@workspace/db/schema");
            const { eq } = await import("drizzle-orm");
            const existing = await db
              .select()
              .from(userProfileTable)
              .where(eq(userProfileTable.userId, user.id))
              .limit(1);
            if (existing.length === 0) {
              const now = new Date();
              const ends = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
              await db.insert(userProfileTable).values({
                id: crypto.randomUUID(),
                userId: user.id,
                trialStartDate: now,
                trialEndsAt: ends,
              });
            }
          } catch (err) {
            console.error("[auth] Failed to create user profile:", err);
          }
          // Welcome email (best-effort, fire-and-forget; never blocks signup).
          const name = user.name || user.email.split("@")[0];
          dispatchEmail({
            to: user.email,
            context: "welcome",
            ...welcomeEmail({ name, dashboardUrl: `${APP_URL}/dashboard` }),
          });
        },
      },
    },
  },
});
