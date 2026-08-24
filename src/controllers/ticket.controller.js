import prisma from "../db/prisma.js";

const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved"]);
const ALLOWED_CLASSIFICATIONS = new Set([
  "CAN_AUTO_FIX",
  "NEEDS_REMOTE_TAKEOVER",
  "MANUAL_VISIT_REQUIRED",
]);

export async function getTickets(req, res, next) {
  try {
    const { status, classification } = req.query;

    if (status !== undefined) {
      if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          error: "Invalid status filter. Use open, in_progress, or resolved.",
        });
      }
    }

    if (classification !== undefined) {
      if (
        typeof classification !== "string" ||
        !ALLOWED_CLASSIFICATIONS.has(classification)
      ) {
        return res.status(400).json({
          error:
            "Invalid classification filter. Use CAN_AUTO_FIX, NEEDS_REMOTE_TAKEOVER, or MANUAL_VISIT_REQUIRED.",
        });
      }
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (classification) {
      where.aiDecision = classification;
    }

    const tickets = await prisma.ticket.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ tickets });
  } catch (error) {
    return next(error);
  }
}
