import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../errors/http-error.js";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import {
  deleteMachine,
  listMachines,
  saveMachine,
  type MachineDto,
  type MachineInput,
} from "../services/inventory.service.js";
import { wakeMachine } from "../services/wol.service.js";

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "Machine ID must be a positive integer");
  }
  return id;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readMachineInput(body: Record<string, unknown>): MachineInput {
  return {
    assetTag: readString(body.assetTag),
    name: readString(body.name),
    department: readString(body.department),
    location: readString(body.location),
    macAddress: readString(body.macAddress),
    broadcastAddress: readString(body.broadcastAddress) || "255.255.255.255",
    wolPort: typeof body.wolPort === "number" ? body.wolPort : 9,
    hasProjector: body.hasProjector === true,
    hasPrinter: body.hasPrinter === true,
    hasMonitor: body.hasMonitor === true,
    hasSpeakers: body.hasSpeakers === true,
    notes: readString(body.notes) || null,
  };
}

export async function getMachines(
  _req: Request,
  res: Response<{ machines: MachineDto[] }>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ machines: await listMachines() });
  } catch (error: unknown) {
    next(error);
  }
}

export async function postMachine(
  req: Request<unknown, MachineDto, Record<string, unknown>>,
  res: Response<MachineDto>,
  next: NextFunction,
): Promise<void> {
  try {
    res.status(201).json(await saveMachine(null, readMachineInput(req.body)));
  } catch (error: unknown) {
    next(error);
  }
}

export async function patchMachine(
  req: Request<{ id: string }, MachineDto, Record<string, unknown>>,
  res: Response<MachineDto>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await saveMachine(parseId(req.params.id), readMachineInput(req.body)));
  } catch (error: unknown) {
    next(error);
  }
}

export async function removeMachine(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteMachine(parseId(req.params.id));
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
}

export async function wakeMachineController(
  req: Request<{ id: string }>,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  try {
    await wakeMachine(parseId(req.params.id), res.locals.technician.id);
    res.status(202).json({ message: "Wake packet sent" });
  } catch (error: unknown) {
    next(error);
  }
}
