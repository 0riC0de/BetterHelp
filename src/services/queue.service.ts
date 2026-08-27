import { Prisma } from "@prisma/client";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { TICKET_VIEW_SELECT, toTicketDto } from "../domain/ticket-view.js";
import { publishTicketEvent } from "../realtime/ticket-events.js";

const QUEUE_SELECT = {
  id: true,
  name: true,
  color: true,
  description: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.QueueSelect;

type QueueRecord = Prisma.QueueGetPayload<{ select: typeof QUEUE_SELECT }>;

export interface QueueDto {
  id: number;
  name: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueInput {
  name: string;
  color: string;
  description: string | null;
  isDefault: boolean;
}

function toQueueDto(queue: QueueRecord): QueueDto {
  return {
    ...queue,
    createdAt: queue.createdAt.toISOString(),
    updatedAt: queue.updatedAt.toISOString(),
  };
}

function validateHexColor(value: string): string {
  const color = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new HttpError(400, "Queue color must be a hex color like #1976d2");
  }
  return color.toLowerCase();
}

function validateQueueInput(input: QueueInput): QueueInput {
  const name = input.name.trim();
  if (!name) {
    throw new HttpError(400, "Queue name is required");
  }
  return {
    name,
    color: validateHexColor(input.color),
    description: input.description?.trim() || null,
    isDefault: input.isDefault,
  };
}

async function publishAffectedTicketUpdates(ticketIds: number[]): Promise<void> {
  if (!ticketIds.length) return;
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    select: TICKET_VIEW_SELECT,
  });
  for (const ticket of tickets) {
    publishTicketEvent({ type: "updated", reason: "queue_changed", ticket: toTicketDto(ticket) });
  }
}

export async function listQueues(): Promise<QueueDto[]> {
  const queues = await prisma.queue.findMany({
    select: QUEUE_SELECT,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return queues.map(toQueueDto);
}

export async function saveQueue(queueId: number | null, rawInput: QueueInput): Promise<QueueDto> {
  const input = validateQueueInput(rawInput);
  const queueCount = await prisma.queue.count();
  const shouldDefault = input.isDefault || queueCount === 0;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      if (shouldDefault) {
        await transaction.queue.updateMany({
          where: { ...(queueId ? { id: { not: queueId } } : {}), isDefault: true },
          data: { isDefault: false },
        });
      }

      const queue = queueId
        ? await transaction.queue.update({
            where: { id: queueId },
            data: { ...input, isDefault: shouldDefault },
            select: QUEUE_SELECT,
          })
        : await transaction.queue.create({
            data: { ...input, isDefault: shouldDefault },
            select: QUEUE_SELECT,
          });
      const affectedTickets = queueId
        ? await transaction.ticket.findMany({
            where: { queueId: queue.id },
            select: { id: true },
          })
        : [];
      return { queue, affectedTicketIds: affectedTickets.map((ticket) => ticket.id) };
    });

    void publishAffectedTicketUpdates(result.affectedTicketIds).catch((error: unknown) => {
      console.error("Queue ticket refresh failed", error);
    });
    return toQueueDto(result.queue);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpError(409, "Queue name is already in use");
      }
      if (error.code === "P2025") {
        throw new HttpError(404, "Queue not found");
      }
    }
    throw error;
  }
}

export async function deleteQueue(queueId: number): Promise<void> {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
    select: { id: true, isDefault: true },
  });
  if (!queue) throw new HttpError(404, "Queue not found");

  const result = await prisma.$transaction(async (transaction) => {
    const affectedTickets = await transaction.ticket.findMany({
      where: { queueId },
      select: { id: true },
    });

    await transaction.ticket.updateMany({
      where: { queueId },
      data: { queueId: null },
    });

    await transaction.queue.delete({ where: { id: queueId } });

    if (queue.isDefault) {
      const nextQueue = await transaction.queue.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (nextQueue) {
        await transaction.queue.update({
          where: { id: nextQueue.id },
          data: { isDefault: true },
        });
      }
    }

    return affectedTickets.map((ticket) => ticket.id);
  });

  void publishAffectedTicketUpdates(result).catch((error: unknown) => {
    console.error("Queue ticket refresh failed", error);
  });
}
