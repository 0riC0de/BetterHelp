import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../errors/http-error.js";
import {
  deleteQueue,
  listQueues,
  saveQueue,
  type QueueDto,
  type QueueInput,
} from "../services/queue.service.js";

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "Queue ID must be a positive integer");
  }
  return id;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readQueueInput(body: Record<string, unknown>): QueueInput {
  return {
    name: readString(body.name),
    color: readString(body.color) || "#1976d2",
    description: readString(body.description) || null,
    isDefault: body.isDefault === true,
  };
}

export async function getQueues(
  _req: Request,
  res: Response<{ queues: QueueDto[] }>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ queues: await listQueues() });
  } catch (error: unknown) {
    next(error);
  }
}

export async function postQueue(
  req: Request<unknown, QueueDto, Record<string, unknown>>,
  res: Response<QueueDto>,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(201).json(await saveQueue(null, readQueueInput(req.body)));
  } catch (error: unknown) {
    next(error);
  }
}

export async function patchQueue(
  req: Request<{ id: string }, QueueDto, Record<string, unknown>>,
  res: Response<QueueDto>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await saveQueue(parseId(req.params.id), readQueueInput(req.body)));
  } catch (error: unknown) {
    next(error);
  }
}

export async function removeQueue(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteQueue(parseId(req.params.id));
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
}
