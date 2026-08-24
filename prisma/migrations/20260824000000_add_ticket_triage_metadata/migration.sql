ALTER TABLE "Ticket"
ADD COLUMN "pcNumber" INTEGER,
ADD COLUMN "summary" TEXT,
ADD COLUMN "aiConfidence" DOUBLE PRECISION,
ADD COLUMN "suggestedScript" TEXT;

CREATE INDEX "Ticket_pcNumber_idx" ON "Ticket"("pcNumber");
