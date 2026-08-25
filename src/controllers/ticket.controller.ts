import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import prisma from "../db/prisma.js";
import { isTicketStatus, type TicketStatus } from "../domain/ticket.js";
import {
  isTriageClassification,
  type TriageClassification,
} from "../domain/triage.js";

const INVALID_STATUS_MESSAGE =
  "Invalid status filter. Use open, in_progress, or resolved.";
const INVALID_CLASSIFICATION_MESSAGE =
  "Invalid classification filter. Use CAN_AUTO_FIX, NEEDS_REMOTE_TAKEOVER, or MANUAL_VISIT_REQUIRED.";

const TICKET_LIST_SELECT = {
  id: true,
  userPhone: true,
  userName: true,
  pcNumber: true,
  rawMessage: true,
  summary: true,
  status: true,
  aiDecision: true,
  aiConfidence: true,
  suggestedScript: true,
  scriptExecuted: true,
  executionOutput: true,
  createdAt: true,
  resolvedAt: true,
} satisfies Prisma.TicketSelect;

type TicketListItem = Prisma.TicketGetPayload<{
  select: typeof TICKET_LIST_SELECT;
}>;

interface TicketListResponse {
  tickets: TicketListItem[];
}

interface ErrorResponse {
  error: string;
}

class InvalidFilterError extends Error {}

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
    throw new InvalidFilterError(errorMessage);
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

export async function getTickets(
  req: Request,
  res: Response<TicketListResponse | ErrorResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const tickets = await prisma.ticket.findMany({
      where: createTicketFilter(req.query),
      select: TICKET_LIST_SELECT,
      orderBy: { createdAt: "desc" },
    });

    res.json({ tickets });
  } catch (error: unknown) {
    if (error instanceof InvalidFilterError) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
}
