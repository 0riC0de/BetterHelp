import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { isTicketStatus, type TicketStatus } from "../domain/ticket.js";
import type { TicketDto } from "../domain/ticket-view.js";
import {
  isTriageClassification,
  type TriageClassification,
} from "../domain/triage.js";
import { HttpError } from "../errors/http-error.js";
import { changeTicketStatus, listTickets } from "../services/ticket.service.js";

const INVALID_STATUS_MESSAGE =
  "Invalid status filter. Use open, in_progress, or resolved.";
const INVALID_CLASSIFICATION_MESSAGE =
  "Invalid classification filter. Use CAN_AUTO_FIX, NEEDS_REMOTE_TAKEOVER, or MANUAL_VISIT_REQUIRED.";

interface TicketListResponse {
  tickets: TicketDto[];
}

interface UpdateStatusBody {
  status?: unknown;
}

type ValueGuard<T extends string> = (value: unknown) => value is T;

function parseOptionalFilter<T extends string>(
  value: unknown,
  isAllowed: ValueGuard<T>,
  errorMessage: string,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isAllowed(value)) {
    throw new HttpError(400, errorMessage);
  }

  return value;
}

function createTicketFilter(query: Request["query"]): Prisma.TicketWhereInput {
  const status = parseOptionalFilter<TicketStatus>(
    query.status,
    isTicketStatus,
    INVALID_STATUS_MESSAGE,
  );
  const classification = parseOptionalFilter<TriageClassification>(
    query.classification,
    isTriageClassification,
    INVALID_CLASSIFICATION_MESSAGE,
  );

  return {
    ...(status ? { status } : {}),
    ...(classification ? { aiDecision: classification } : {}),
  };
}

function parseTicketId(value: string): number {
  const ticketId = Number(value);

  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
    throw new HttpError(400, "Ticket ID must be a positive integer");
  }

  return ticketId;
}

export async function getTickets(
  req: Request,
  res: Response<TicketListResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ tickets: await listTickets(createTicketFilter(req.query)) });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateTicketStatus(
  req: Request<{ id: string }, TicketDto, UpdateStatusBody>,
  res: Response<TicketDto>,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isTicketStatus(req.body.status)) {
      throw new HttpError(400, INVALID_STATUS_MESSAGE);
    }

    const ticket = await changeTicketStatus(
      parseTicketId(req.params.id),
      req.body.status,
    );
    res.json(ticket);
  } catch (error: unknown) {
    next(error);
  }
}
