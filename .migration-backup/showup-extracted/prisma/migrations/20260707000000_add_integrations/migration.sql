-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM (
  'google_calendar', 'microsoft_outlook', 'fresha', 'opus_dental', 'tripletex'
);
CREATE TYPE "IntegrationStatus" AS ENUM (
  'connected', 'disconnected', 'error', 'syncing'
);

-- CreateTable Integration
CREATE TABLE "Integration" (
  "id"                   TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "provider"             "IntegrationProvider" NOT NULL,
  "status"               "IntegrationStatus"  NOT NULL DEFAULT 'disconnected',
  "credentialsEncrypted" TEXT NOT NULL DEFAULT '',
  "lastSyncedAt"         TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Integration_userId_provider_key" UNIQUE ("userId", "provider")
);
CREATE INDEX "Integration_userId_idx"  ON "Integration"("userId");
CREATE INDEX "Integration_status_idx"  ON "Integration"("status");

-- CreateTable SyncedAppointment
CREATE TABLE "SyncedAppointment" (
  "id"              TEXT      NOT NULL,
  "userId"          TEXT      NOT NULL,
  "integrationId"   TEXT      NOT NULL,
  "externalId"      TEXT      NOT NULL,
  "appointmentData" JSONB     NOT NULL,
  "syncedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncedAppointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SyncedAppointment_integrationId_externalId_key"
    UNIQUE ("integrationId", "externalId")
);
CREATE INDEX "SyncedAppointment_userId_idx"        ON "SyncedAppointment"("userId");
CREATE INDEX "SyncedAppointment_integrationId_idx" ON "SyncedAppointment"("integrationId");
ALTER TABLE "SyncedAppointment"
  ADD CONSTRAINT "SyncedAppointment_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "Integration"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable IntegrationConfig (all routes migrated in this same PR)
DROP TABLE IF EXISTS "IntegrationConfig";
