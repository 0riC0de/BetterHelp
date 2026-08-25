CREATE TYPE "WakeAttemptStatus" AS ENUM ('PACKET_SENT', 'SEND_FAILED');

ALTER TABLE "Ticket"
ADD COLUMN "profilePictureUrl" TEXT,
ADD COLUMN "machineId" INTEGER,
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "TicketMessage"
ADD COLUMN "mediaMimeType" TEXT,
ADD COLUMN "mediaData" TEXT,
ADD COLUMN "mediaFileName" TEXT;

CREATE TABLE "Department" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Machine" (
  "id" SERIAL NOT NULL,
  "assetTag" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "macAddress" TEXT NOT NULL,
  "broadcastAddress" TEXT NOT NULL DEFAULT '255.255.255.255',
  "wolPort" INTEGER NOT NULL DEFAULT 9,
  "hasProjector" BOOLEAN NOT NULL DEFAULT false,
  "hasPrinter" BOOLEAN NOT NULL DEFAULT false,
  "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
  "hasSpeakers" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "departmentId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Machine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Machine_macAddress_format_check" CHECK ("macAddress" ~ '^[0-9A-F]{12}$'),
  CONSTRAINT "Machine_wolPort_range_check" CHECK ("wolPort" BETWEEN 1 AND 65535)
);

CREATE TABLE "WakeAttempt" (
  "id" SERIAL NOT NULL,
  "machineId" INTEGER NOT NULL,
  "technicianId" INTEGER NOT NULL,
  "status" "WakeAttemptStatus" NOT NULL,
  "macAddressSnapshot" TEXT NOT NULL,
  "targetSnapshot" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WakeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Machine_assetTag_key" ON "Machine"("assetTag");
CREATE UNIQUE INDEX "Machine_macAddress_key" ON "Machine"("macAddress");
CREATE INDEX "Machine_departmentId_location_idx" ON "Machine"("departmentId", "location");
CREATE INDEX "Machine_isActive_idx" ON "Machine"("isActive");
CREATE INDEX "WakeAttempt_machineId_createdAt_idx" ON "WakeAttempt"("machineId", "createdAt");
CREATE INDEX "WakeAttempt_technicianId_createdAt_idx" ON "WakeAttempt"("technicianId", "createdAt");
CREATE INDEX "Ticket_archivedAt_updatedAt_idx" ON "Ticket"("archivedAt", "updatedAt");
CREATE INDEX "Ticket_machineId_idx" ON "Ticket"("machineId");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_machineId_fkey"
FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WakeAttempt" ADD CONSTRAINT "WakeAttempt_machineId_fkey"
FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WakeAttempt" ADD CONSTRAINT "WakeAttempt_technicianId_fkey"
FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
