DO $$
BEGIN
    CREATE TYPE "AnomalyType" AS ENUM ('LATENCY', 'ERROR_RATE', 'TIMEOUT', 'ISOLATION_FOREST');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Incident"
    ADD COLUMN IF NOT EXISTS "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "severity" "AnomalySeverity" NOT NULL DEFAULT 'LOW';

-- CreateTable
CREATE TABLE "AnomalyEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "checkId" TEXT,
    "type" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkAt" TIMESTAMP(3),

    CONSTRAINT "AnomalyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnomalyEvent_incidentId_detectedAt_idx" ON "AnomalyEvent"("incidentId", "detectedAt");

-- CreateIndex
CREATE INDEX "AnomalyEvent_monitorId_detectedAt_idx" ON "AnomalyEvent"("monitorId", "detectedAt");

-- CreateIndex
CREATE INDEX "AnomalyEvent_type_detectedAt_idx" ON "AnomalyEvent"("type", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyEvent_checkId_type_key" ON "AnomalyEvent"("checkId", "type");

-- CreateIndex
CREATE INDEX "Incident_monitorId_lastEventAt_idx" ON "Incident"("monitorId", "lastEventAt");

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyEvent" ADD CONSTRAINT "AnomalyEvent_checkId_checkAt_fkey" FOREIGN KEY ("checkId", "checkAt") REFERENCES "MonitorCheck"("id", "checkedAt") ON DELETE SET NULL ON UPDATE CASCADE;
