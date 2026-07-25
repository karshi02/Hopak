-- CreateEnum
CREATE TYPE "OwnerApplicationStatus" AS ENUM ('DRAFT', 'EMAIL_VERIFIED', 'COMPLETED');

-- CreateTable
CREATE TABLE "OwnerApplication" (
    "id" TEXT NOT NULL,
    "status" "OwnerApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dormName" TEXT,
    "province" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "waterRate" DOUBLE PRECISION,
    "electricRate" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "note" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rooms" JSONB,
    "otpCodeHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpSentAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerApplication_email_key" ON "OwnerApplication"("email");
