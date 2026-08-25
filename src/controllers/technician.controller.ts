import type { TechnicianRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../errors/http-error.js";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import {
  createTechnician,
  deleteTechnician,
  listTechnicians,
  resetTechnicianPassword,
  type ManagedTechnician,
} from "../services/technician.service.js";

interface CreateTechnicianBody {
  email?: unknown;
  name?: unknown;
  password?: unknown;
  role?: unknown;
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "Technician ID must be a positive integer");
  }
  return id;
}

export async function getTechnicians(
  _req: Request,
  res: Response<{ technicians: ManagedTechnician[] }>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ technicians: await listTechnicians() });
  } catch (error: unknown) {
    next(error);
  }
}

export async function postTechnician(
  req: Request<unknown, ManagedTechnician, CreateTechnicianBody>,
  res: Response<ManagedTechnician>,
  next: NextFunction,
): Promise<void> {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role;
    if (!email.includes("@") || !name || password.length < 12) {
      throw new HttpError(400, "Valid name, email, and 12-character password are required");
    }
    if (role !== "ADMIN" && role !== "TECHNICIAN") {
      throw new HttpError(400, "Role must be ADMIN or TECHNICIAN");
    }
    res.status(201).json(
      await createTechnician({ email, name, password, role: role as TechnicianRole }),
    );
  } catch (error: unknown) {
    next(error);
  }
}

export async function removeTechnician(
  req: Request<{ id: string }>,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteTechnician(parseId(req.params.id), res.locals.technician.id);
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
}

export async function patchTechnicianPassword(
  req: Request<{ id: string }, unknown, { password?: unknown }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (typeof req.body.password !== "string") {
      throw new HttpError(400, "Password is required");
    }
    await resetTechnicianPassword(parseId(req.params.id), req.body.password);
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
}
