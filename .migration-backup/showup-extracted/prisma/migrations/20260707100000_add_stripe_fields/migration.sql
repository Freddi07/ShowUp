ALTER TABLE "UserProfile" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "stripePaymentMethodId" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "paymentMethodCollected" BOOLEAN NOT NULL DEFAULT false;
