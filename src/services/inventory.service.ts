import { isIP } from "node:net";

import { Prisma } from "@prisma/client";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";

const MACHINE_SELECT = {
  id: true,
  assetTag: true,
  name: true,
  location: true,
  macAddress: true,
  broadcastAddress: true,
  wolPort: true,
  hasProjector: true,
  hasPrinter: true,
  hasMonitor: true,
  hasSpeakers: true,
  notes: true,
  isActive: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MachineSelect;

type MachineRecord = Prisma.MachineGetPayload<{ select: typeof MACHINE_SELECT }>;

export interface MachineDto {
  id: number;
  assetTag: string;
  name: string;
  location: string;
  macAddress: string;
  broadcastAddress: string;
  wolPort: number;
  hasProjector: boolean;
  hasPrinter: boolean;
  hasMonitor: boolean;
  hasSpeakers: boolean;
  notes: string | null;
  department: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MachineInput {
  assetTag: string;
  name: string;
  department: string;
  location: string;
  macAddress: string;
  broadcastAddress: string;
  wolPort: number;
  hasProjector: boolean;
  hasPrinter: boolean;
  hasMonitor: boolean;
  hasSpeakers: boolean;
  notes: string | null;
}

function toMachineDto(machine: MachineRecord): MachineDto {
  const { isActive: _isActive, ...data } = machine;
  return {
    ...data,
    macAddress: data.macAddress.match(/.{2}/g)?.join(":") ?? data.macAddress,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
}

export function normalizeMacAddress(value: string): string {
  const macAddress = value.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (!/^[0-9A-F]{12}$/.test(macAddress)) {
    throw new HttpError(400, "MAC address must contain 12 hexadecimal characters");
  }
  return macAddress;
}

function validateMachineInput(input: MachineInput): MachineInput {
  const assetTag = input.assetTag.trim().toUpperCase();
  const name = input.name.trim();
  const department = input.department.trim();
  const location = input.location.trim();
  if (!assetTag || !name || !department || !location) {
    throw new HttpError(400, "Asset tag, name, department, and location are required");
  }
  if (isIP(input.broadcastAddress) !== 4) {
    throw new HttpError(400, "Broadcast address must be a valid IPv4 address");
  }
  if (!Number.isSafeInteger(input.wolPort) || input.wolPort < 1 || input.wolPort > 65535) {
    throw new HttpError(400, "Wake-on-LAN port must be between 1 and 65535");
  }
  return {
    ...input,
    assetTag,
    name,
    department,
    location,
    macAddress: normalizeMacAddress(input.macAddress),
    notes: input.notes?.trim() || null,
  };
}

export async function listMachines(): Promise<MachineDto[]> {
  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    select: MACHINE_SELECT,
    orderBy: [{ department: { name: "asc" } }, { location: "asc" }],
  });
  return machines.map(toMachineDto);
}

export async function saveMachine(
  machineId: number | null,
  rawInput: MachineInput,
): Promise<MachineDto> {
  const input = validateMachineInput(rawInput);
  const department = await prisma.department.upsert({
    where: { name: input.department },
    create: { name: input.department },
    update: {},
    select: { id: true },
  });
  const data = {
    assetTag: input.assetTag,
    name: input.name,
    location: input.location,
    macAddress: input.macAddress,
    broadcastAddress: input.broadcastAddress,
    wolPort: input.wolPort,
    hasProjector: input.hasProjector,
    hasPrinter: input.hasPrinter,
    hasMonitor: input.hasMonitor,
    hasSpeakers: input.hasSpeakers,
    notes: input.notes,
    departmentId: department.id,
    isActive: true,
  };
  try {
    const machine = machineId
      ? await prisma.machine.update({ where: { id: machineId }, data, select: MACHINE_SELECT })
      : await prisma.machine.create({ data, select: MACHINE_SELECT });
    return toMachineDto(machine);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Asset tag or MAC address is already in use");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new HttpError(404, "Machine not found");
    }
    throw error;
  }
}

export async function deleteMachine(machineId: number): Promise<void> {
  const result = await prisma.machine.updateMany({
    where: { id: machineId, isActive: true },
    data: { isActive: false },
  });
  if (result.count !== 1) throw new HttpError(404, "Machine not found");
}

export async function getMachineForWake(machineId: number) {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, isActive: true },
    select: {
      id: true,
      macAddress: true,
      broadcastAddress: true,
      wolPort: true,
    },
  });
  if (!machine) throw new HttpError(404, "Machine not found");
  return machine;
}

export async function getInventoryContext(rawMessage: string): Promise<string | undefined> {
  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    select: {
      assetTag: true,
      name: true,
      location: true,
      department: { select: { name: true } },
      hasProjector: true,
      hasPrinter: true,
      hasMonitor: true,
      hasSpeakers: true,
    },
    take: 50,
    orderBy: { assetTag: "asc" },
  });
  if (!machines.length) return undefined;
  const normalizedMessage = rawMessage.toLowerCase();
  const matches = machines.filter((machine) =>
    [machine.assetTag, machine.name, machine.location].some((value) =>
      normalizedMessage.includes(value.toLowerCase()),
    ),
  );
  const contextMachines = matches.length ? matches : machines.slice(0, 20);
  return contextMachines.map((machine) => {
    const equipment = [
      machine.hasProjector && "projector",
      machine.hasPrinter && "printer",
      machine.hasMonitor && "monitor",
      machine.hasSpeakers && "speakers",
    ].filter(Boolean).join(", ") || "none recorded";
    return `${machine.assetTag}: ${machine.name}, ${machine.department.name}, ${machine.location}; equipment: ${equipment}`;
  }).join("\n");
}

export async function findMachineIdForPcNumber(
  pcNumber: number | null,
): Promise<number | null> {
  if (pcNumber === null) return null;
  const values = [String(pcNumber), `PC-${pcNumber}`, `PC${pcNumber}`];
  const machine = await prisma.machine.findFirst({
    where: { isActive: true, assetTag: { in: values } },
    select: { id: true },
  });
  return machine?.id ?? null;
}
