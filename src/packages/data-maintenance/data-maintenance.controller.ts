import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../../errors/http-error.js";
import { clearDatabaseTarget, getDatabaseSummary } from "./data-maintenance.service.js";
import { isClearTarget } from "./ClearTarget.js";

export async function readDatabaseSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getDatabaseSummary());
  } catch (error: unknown) {
    next(error);
  }
}

export async function clearDatabaseData(
  req: Request<unknown, unknown, { target?: unknown; confirmation?: unknown }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isClearTarget(req.body.target)) throw new HttpError(400, "Invalid clear target");
    if (req.body.confirmation !== `DELETE ${req.body.target}`) {
      throw new HttpError(400, `Confirmation must equal DELETE ${req.body.target}`);
    }
    res.json(await clearDatabaseTarget(req.body.target));
  } catch (error: unknown) {
    next(error);
  }
}
