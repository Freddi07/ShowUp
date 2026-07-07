// @polsia:shared — edit only through declared slots. Code installed by polsia/template-next@0.3.0.
//
// Typed env via @t3-oss/env-nextjs.
//
// Modules contribute env vars via their manifest `contributions` block.
// The installer regenerates this file's slots between the markers below.
// Hand-editing outside those slots is rejected by the ownership validator.
//
// The `no-secrets-in-client-bundle` validator scans the build output and rejects
// the install if any non-NEXT_PUBLIC_ env name appears in client chunks.

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // D24: Prisma is the framework-native DB client. DATABASE_URL is
    // injected by Polsia at deploy time (D23). The actual Postgres is
    // provisioned by a separate Polsia service; this module ships the
    // client only.
    DATABASE_URL: z.string().url(),
    // @polsia:slot env_vars_server start
    // Modules append additional server-side env vars here at install time.
    TWILIO_ACCOUNT_SID: z.string().min(1),
    TWILIO_AUTH_TOKEN: z.string().min(1),
    TWILIO_PHONE_NUMBER: z.string().min(1),
    // @polsia:contrib better-auth start
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    POLSIA_OWNER_EMAIL: z.string().optional(),
    // @polsia:contrib better-auth end
    ENCRYPTION_KEY: z.string().min(32),
    TRIPLETEX_SESSION_TOKEN: z.string().optional(),
    OPUS_DENTAL_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().min(16),
    TRIPLETEX_WEBHOOK_SECRET: z.string().optional(),
    BOOKSY_WEBHOOK_SECRET: z.string().optional(),
    CLINIKO_WEBHOOK_SECRET: z.string().optional(),
    FRESHA_WEBHOOK_SECRET: z.string().optional(),
    VISMA_CLIENT_ID: z.string().optional(),
    VISMA_CLIENT_SECRET: z.string().optional(),
    FIKEN_CLIENT_ID: z.string().optional(),
    FIKEN_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),
    // @polsia:contrib stripe-billing start
    POLSIA_API_BASE_URL: z.string().url().default('https://polsia.com'),
    POLSIA_API_KEY: z.string().min(1).optional(),
    POLSIA_API_TOKEN: z.string().min(1).optional(),
    // @polsia:contrib stripe-billing end
    // @polsia:contrib email start
    POLSIA_EMAIL_PROXY_URL: z.string().url(),
    // @polsia:contrib email end
    // @polsia:slot env_vars_server end
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    // Base for @/lib/api-client + proxy.ts connect-src. Default-empty
    // (unset) means same-origin `/api`; set only for an external API origin.
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    // @polsia:slot env_vars_client start
    // Modules append NEXT_PUBLIC_* env vars here at install time.
    // @polsia:slot env_vars_client end
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    // @polsia:slot env_runtime start
    // Modules append runtime-env entries here at install time.
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    // @polsia:contrib better-auth start
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    POLSIA_OWNER_EMAIL: process.env.POLSIA_OWNER_EMAIL,
    // @polsia:contrib better-auth end
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    TRIPLETEX_SESSION_TOKEN: process.env.TRIPLETEX_SESSION_TOKEN,
    OPUS_DENTAL_API_KEY: process.env.OPUS_DENTAL_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    TRIPLETEX_WEBHOOK_SECRET: process.env.TRIPLETEX_WEBHOOK_SECRET,
    BOOKSY_WEBHOOK_SECRET: process.env.BOOKSY_WEBHOOK_SECRET,
    CLINIKO_WEBHOOK_SECRET: process.env.CLINIKO_WEBHOOK_SECRET,
    FRESHA_WEBHOOK_SECRET: process.env.FRESHA_WEBHOOK_SECRET,
    VISMA_CLIENT_ID: process.env.VISMA_CLIENT_ID,
    VISMA_CLIENT_SECRET: process.env.VISMA_CLIENT_SECRET,
    FIKEN_CLIENT_ID: process.env.FIKEN_CLIENT_ID,
    FIKEN_CLIENT_SECRET: process.env.FIKEN_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    // @polsia:contrib stripe-billing start
    POLSIA_API_BASE_URL: process.env.POLSIA_API_BASE_URL,
    POLSIA_API_KEY: process.env.POLSIA_API_KEY,
    POLSIA_API_TOKEN: process.env.POLSIA_API_TOKEN,
    // @polsia:contrib stripe-billing end
    // @polsia:contrib email start
    POLSIA_EMAIL_PROXY_URL: process.env.POLSIA_EMAIL_PROXY_URL,
    // @polsia:contrib email end
    // @polsia:slot env_runtime end
  },
  emptyStringAsUndefined: true,
  // SKIP_ENV_VALIDATION=1 bypasses validation for envless builds (lint/CI/local).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
