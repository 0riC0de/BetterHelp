import prisma from "../db/prisma.js";

const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved"]);

export async function getTickets(req, res, next) {
  try {
    const { status } = req.query;

    if (status !== undefined) {
      if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          error: "Invalid status filter. Use open, in_progress, or resolved.",
        });
      }
    }

    const tickets = await prisma.ticket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ tickets });
  } catch (error) {
    return next(error);
  }
}
