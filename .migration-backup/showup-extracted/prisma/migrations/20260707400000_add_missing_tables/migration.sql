-- Idempotent catch-up migration: creates all tables that exist in the Prisma
-- schema but have no prior CREATE TABLE migration. Also re-applies the stripe
-- column additions from 20260707100000 using IF NOT EXISTS so that migration
-- can be resolved/marked applied even if it previously failed.

-- Enums (templates.prisma / reminders.prisma)
DO $$ BEGIN
  CREATE TYPE "TemplateType" AS ENUM ('reminder_24h', 'reminder_2h', 'confirmation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TemplateLanguage" AS ENUM ('no', 'en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM (
    'PENDING', 'REMINDED', 'CONFIRMED', 'CANCELLED', 'RESCHEDULE_REQUESTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UserProfile (profile.prisma)
CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id"                     TEXT        NOT NULL,
  "userId"                 TEXT        NOT NULL,
  "businessType"           TEXT,
  "phone"                  TEXT,
  "trialStartDate"         TIMESTAMP(3) NOT NULL,
  "trialEndsAt"            TIMESTAMP(3) NOT NULL,
  "stripeCustomerId"       TEXT,
  "stripePaymentMethodId"  TEXT,
  "paymentMethodCollected" BOOLEAN     NOT NULL DEFAULT false,
  "subscriptionStatus"     TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId");

-- Idempotently re-apply the stripe columns (20260707100000 may have failed)
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "stripeCustomerId"       TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId"  TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "paymentMethodCollected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "subscriptionStatus"     TEXT;

-- NotificationSettings (notification-settings.prisma)
CREATE TABLE IF NOT EXISTS "NotificationSettings" (
  "id"            TEXT        NOT NULL,
  "userId"        TEXT        NOT NULL,
  "remind48h"     BOOLEAN     NOT NULL DEFAULT false,
  "remind24h"     BOOLEAN     NOT NULL DEFAULT true,
  "remind2h"      BOOLEAN     NOT NULL DEFAULT false,
  "channelSms"    BOOLEAN     NOT NULL DEFAULT true,
  "channelEmail"  BOOLEAN     NOT NULL DEFAULT false,
  "autoFollowUp"  BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSettings_userId_key" ON "NotificationSettings"("userId");
CREATE INDEX IF NOT EXISTS "NotificationSettings_userId_idx" ON "NotificationSettings"("userId");

-- password_reset_token (forgot-password.prisma, @@map("password_reset_token"))
CREATE TABLE IF NOT EXISTS "password_reset_token" (
  "id"        TEXT        NOT NULL,
  "token"     TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_token_token_key" ON "password_reset_token"("token");
CREATE INDEX IF NOT EXISTS "password_reset_token_userId_idx" ON "password_reset_token"("userId");

-- Customer (reminders.prisma)
CREATE TABLE IF NOT EXISTS "Customer" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT,
  "name"       TEXT        NOT NULL,
  "phone"      TEXT,
  "email"      TEXT,
  "externalId" TEXT,
  "source"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Customer_userId_idx" ON "Customer"("userId");
CREATE INDEX IF NOT EXISTS "Customer_userId_externalId_source_idx" ON "Customer"("userId", "externalId", "source");
CREATE INDEX IF NOT EXISTS "Customer_externalId_idx" ON "Customer"("externalId");
CREATE INDEX IF NOT EXISTS "Customer_source_idx" ON "Customer"("source");

-- Appointment (reminders.prisma)
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id"          TEXT              NOT NULL,
  "clientName"  TEXT              NOT NULL,
  "clientPhone" TEXT              NOT NULL,
  "scheduledAt" TIMESTAMP(3)      NOT NULL,
  "reminderAt"  TIMESTAMP(3)      NOT NULL,
  "status"      "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  "twilioSid"   TEXT,
  "customerId"  TEXT,
  "externalId"  TEXT,
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Appointment_status_reminderAt_idx" ON "Appointment"("status", "reminderAt");
CREATE INDEX IF NOT EXISTS "Appointment_customerId_idx" ON "Appointment"("customerId");
CREATE INDEX IF NOT EXISTS "Appointment_externalId_idx" ON "Appointment"("externalId");
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

-- MessageTemplate (templates.prisma)
CREATE TABLE IF NOT EXISTS "MessageTemplate" (
  "id"        TEXT              NOT NULL,
  "userId"    TEXT              NOT NULL,
  "type"      "TemplateType"    NOT NULL,
  "language"  "TemplateLanguage" NOT NULL DEFAULT 'no',
  "body"      TEXT              NOT NULL,
  "createdAt" TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MessageTemplate_userId_type_language_key"
  ON "MessageTemplate"("userId", "type", "language");
CREATE INDEX IF NOT EXISTS "MessageTemplate_userId_idx" ON "MessageTemplate"("userId");
