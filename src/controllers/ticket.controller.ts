import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { isTicketStatus, type TicketStatus } from "../domain/ticket.js";
import type { TicketDto } from "../domain/ticket-view.js";
import type { TicketMessageDto } from "../domain/ticket-message.js";
import {
  isTriageClassification,
  type TriageClassification,
} from "../domain/triage.js";
import { HttpError } from "../errors/http-error.js";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import {
  changeTicketStatus,
  getTicketConversation,
  listTickets,
  setTicketArchived,
  type TicketConversation,
} from "../services/ticket.service.js";
import { sendTicketMedia, sendTicketReply } from "../services/whatsapp.service.js";

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

interface SendMessageBody {
  text?: unknown;
  clientRequestId?: unknown;
}

interface ArchiveBody {
  archived?: unknown;
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
  const archive = query.archive ?? "active";
  if (archive !== "active" && archive !== "archived" && archive !== "all") {
    throw new HttpError(400, "Archive filter must be active, archived, or all");
  }

  return {
    ...(status ? { status } : {}),
    ...(classification ? { aiDecision: classification } : {}),
    ...(archive === "active"
      ? { archivedAt: null }
      : archive === "archived"
        ? { archivedAt: { not: null } }
        : {}),
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

export async function getTicket(
  req: Request<{ id: string }>,
  res: Response<TicketConversation>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await getTicketConversation(parseTicketId(req.params.id)));
  } catch (error: unknown) {
    next(error);
  }
}

export async function sendTicketMessage(
  req: Request<{ id: string }, TicketMessageDto, SendMessageBody>,
  res: Response<TicketMessageDto, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const clientRequestId =
      typeof req.body.clientRequestId === "string"
        ? req.body.clientRequestId.trim()
        : "";
    if (!text || text.length > 4_000) {
      throw new HttpError(400, "Message must contain between 1 and 4000 characters");
    }
    if (clientRequestId.length < 8 || clientRequestId.length > 100) {
      throw new HttpError(400, "A valid client request ID is required");
    }
    res.status(201).json(
      await sendTicketReply(
        parseTicketId(req.params.id),
        res.locals.technician.id,
        text,
        clientRequestId,
      ),
    );
  } catch (error: unknown) {
    next(error);
  }
}

export async function sendTicketMediaMessage(
  req: Request<{ id: string }, TicketMessageDto, { caption?: unknown; clientRequestId?: unknown }>,
  res: Response<TicketMessageDto, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) throw new HttpError(400, "A media file is required");
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";
    const clientRequestId = typeof req.body.clientRequestId === "string"
      ? req.body.clientRequestId.trim()
      : "";
    if (caption.length > 4_000) throw new HttpError(400, "Caption cannot exceed 4000 characters");
    if (clientRequestId.length < 8 || clientRequestId.length > 100) {
      throw new HttpError(400, "A valid client request ID is required");
    }
    const fileName = req.file.originalname
      .replace(/[\u0000-\u001f\u007f"\\/]/g, "_")
      .slice(0, 180) || "attachment";
    res.status(201).json(await sendTicketMedia(
      parseTicketId(req.params.id),
      res.locals.technician.id,
      { data: req.file.buffer, mimeType: req.file.mimetype, fileName },
      caption,
      clientRequestId,
    ));
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateTicketArchive(
  req: Request<{ id: string }, TicketDto, ArchiveBody>,
  res: Response<TicketDto>,
  next: NextFunction,
): Promise<void> {
  try {
    if (typeof req.body.archived !== "boolean") {
      throw new HttpError(400, "Archived must be true or false");
    }
    res.json(
      await setTicketArchived(parseTicketId(req.params.id), req.body.archived),
    );
  } catch (error: unknown) {
    next(error);
  }
}
