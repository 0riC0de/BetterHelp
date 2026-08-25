-- Preserve existing ticket rows while introducing durable conversation history.
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('RECEIVED', 'PENDING', 'SENT', 'FAILED');

ALTER TABLE "Ticket"
ADD COLUMN "chatId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "TicketMessage" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "technicianId" INTEGER,
  "direction" "MessageDirection" NOT NULL,
  "body" TEXT NOT NULL,
  "deliveryStatus" "MessageDeliveryStatus" NOT NULL,
  "externalMessageId" TEXT,
  "clientRequestId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TicketMessage" (
  "ticketId", "direction", "body", "deliveryStatus", "sentAt", "createdAt"
)
SELECT "id", 'INBOUND'::"MessageDirection", "rawMessage",
  'RECEIVED'::"MessageDeliveryStatus", "createdAt", "createdAt"
FROM "Ticket";

UPDATE "Ticket"
SET "chatId" = CASE
  WHEN "userPhone" LIKE '%@c.us' OR "userPhone" LIKE '%@lid' THEN "userPhone"
  ELSE REGEXP_REPLACE("userPhone", '^\+', '') || '@c.us'
END;

-- Keep the newest unresolved legacy ticket active and close older duplicates.
WITH ranked_active_tickets AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "chatId" ORDER BY "createdAt" DESC, "id" DESC
  ) AS active_rank
  FROM "Ticket"
  WHERE "status" <> 'resolved'
)
UPDATE "Ticket"
SET "status" = 'resolved', "resolvedAt" = COALESCE("resolvedAt", CURRENT_TIMESTAMP)
FROM ranked_active_tickets
WHERE "Ticket"."id" = ranked_active_tickets."id"
  AND ranked_active_tickets.active_rank > 1;

CREATE UNIQUE INDEX "TicketMessage_externalMessageId_key" ON "TicketMessage"("externalMessageId");
CREATE UNIQUE INDEX "TicketMessage_clientRequestId_key" ON "TicketMessage"("clientRequestId");
CREATE INDEX "TicketMessage_ticketId_createdAt_id_idx" ON "TicketMessage"("ticketId", "createdAt", "id");
CREATE INDEX "TicketMessage_technicianId_idx" ON "TicketMessage"("technicianId");
CREATE INDEX "Ticket_chatId_status_idx" ON "Ticket"("chatId", "status");
CREATE UNIQUE INDEX "Ticket_one_active_per_chat_key"
ON "Ticket"("chatId")
WHERE "chatId" IS NOT NULL AND "status" <> 'resolved';

ALTER TABLE "TicketMessage"
ADD CONSTRAINT "TicketMessage_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketMessage"
ADD CONSTRAINT "TicketMessage_technicianId_fkey"
FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
