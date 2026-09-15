CREATE TYPE "RcaStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "RcaReport" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "RcaStatus" NOT NULL DEFAULT 'PENDING',
    "rootCause" TEXT,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,
    "hypotheses" JSONB,
    "evidence" JSONB,
    "validation" JSONB,
    "recommendedActions" JSONB,
    "alternativeHypotheses" JSONB,
    "errors" JSONB,
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RcaReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RcaReport_incidentId_key"
ON "RcaReport"("incidentId");

CREATE INDEX "RcaReport_status_idx"
ON "RcaReport"("status");

CREATE INDEX "RcaReport_createdAt_idx"
ON "RcaReport"("createdAt");

ALTER TABLE "RcaReport"
ADD CONSTRAINT "RcaReport_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
