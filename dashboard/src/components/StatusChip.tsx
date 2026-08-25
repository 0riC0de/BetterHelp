import { Chip } from "@mui/material";

import type { TicketStatus } from "@/types/ticket";

const statusPresentation: Record<
  TicketStatus,
  { label: string; color: string; background: string }
> = {
  open: { label: "Open", color: "#0369a1", background: "#e0f2fe" },
  in_progress: {
    label: "In Progress",
    color: "#a16207",
    background: "#fef9c3",
  },
  resolved: { label: "Resolved", color: "#15803d", background: "#dcfce7" },
};

export default function StatusChip({ status }: { status: TicketStatus }) {
  const presentation = statusPresentation[status];
  return (
    <Chip
      size="small"
      label={presentation.label}
      sx={{ bgcolor: presentation.background, color: presentation.color }}
    />
  );
}
