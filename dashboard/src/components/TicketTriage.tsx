import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import EngineeringOutlined from "@mui/icons-material/EngineeringOutlined";
import HourglassTopOutlined from "@mui/icons-material/HourglassTopOutlined";
import { Chip, Stack, Typography } from "@mui/material";

import type { AiDecision, Ticket } from "@/types/ticket";

const classificationPresentation: Record<
  AiDecision,
  { label: string; color: string; background: string; icon: React.ReactElement }
> = {
  CAN_AUTO_FIX: {
    label: "CAN_AUTO_FIX",
    color: "#166534",
    background: "#dcfce7",
    icon: <AutoFixHighOutlined />,
  },
  NEEDS_REMOTE_TAKEOVER: {
    label: "NEEDS_REMOTE_TAKEOVER",
    color: "#9a3412",
    background: "#ffedd5",
    icon: <DesktopWindowsOutlined />,
  },
  MANUAL_VISIT_REQUIRED: {
    label: "MANUAL_VISIT_REQUIRED",
    color: "#991b1b",
    background: "#fee2e2",
    icon: <EngineeringOutlined />,
  },
};

export default function TicketTriage({ ticket }: { ticket: Ticket }) {
  if (!ticket.aiDecision) {
    return (
      <Chip
        size="small"
        icon={<HourglassTopOutlined />}
        label="AI triage pending"
        sx={{ bgcolor: "#f1f5f9", color: "text.secondary" }}
      />
    );
  }

  const presentation = classificationPresentation[ticket.aiDecision];
  const confidence =
    ticket.aiConfidence === null
      ? null
      : `${Math.round(Math.min(1, Math.max(0, ticket.aiConfidence)) * 100)}% confidence`;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <Chip
        size="small"
        icon={presentation.icon}
        label={presentation.label}
        sx={{ bgcolor: presentation.background, color: presentation.color }}
      />
      {ticket.aiDecision === "CAN_AUTO_FIX" && ticket.suggestedScript && (
        <Chip size="small" variant="outlined" label={ticket.suggestedScript} />
      )}
      {confidence && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
          {confidence}
        </Typography>
      )}
    </Stack>
  );
}
