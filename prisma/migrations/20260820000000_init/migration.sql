CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "userPhone" TEXT NOT NULL,
    "userName" TEXT,
    "rawMessage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "aiDecision" TEXT,
    "scriptExecuted" TEXT,
    "executionOutput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
