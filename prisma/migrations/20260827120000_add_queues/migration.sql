CREATE TABLE "Queue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1976d2',
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Ticket"
ADD COLUMN "queueId" INTEGER;

CREATE UNIQUE INDEX "Queue_name_key" ON "Queue"("name");
CREATE INDEX "Queue_isDefault_idx" ON "Queue"("isDefault");
CREATE INDEX "Ticket_queueId_idx" ON "Ticket"("queueId");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
