-- AlterEnum: Add new integration provider values
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'booksy';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'automaster';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'emekaniker';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'visma';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'fiken';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'cliniko';
