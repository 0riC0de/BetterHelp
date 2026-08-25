import AutoFixHighOutlined from "@mui/icons-material/AutoFixHighOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

import type { Ticket } from "@/types/ticket";
import { getTicketMetrics } from "@/utils/tickets";

interface MetricCardProps {
  label: string;
  value: number;
  color: string;
  background: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, color, background, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems: "center",
              borderRadius: 3,
              bgcolor: background,
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function MetricsOverview({ tickets }: { tickets: readonly Ticket[] }) {
  const metrics = getTicketMetrics(tickets);
  const cards = [
    {
      label: "Total Open Tickets",
      value: metrics.open,
      color: "#0369a1",
      background: "#e0f2fe",
      icon: <ConfirmationNumberOutlined />,
    },
    {
      label: "Auto-Fixable Issues",
      value: metrics.autoFixable,
      color: "#15803d",
      background: "#dcfce7",
      icon: <AutoFixHighOutlined />,
    },
    {
      label: "Remote Takeover Required",
      value: metrics.remoteTakeover,
      color: "#c2410c",
      background: "#ffedd5",
      icon: <DesktopWindowsOutlined />,
    },
    {
      label: "Resolved Today",
      value: metrics.resolvedToday,
      color: "#6d28d9",
      background: "#ede9fe",
      icon: <TaskAltOutlined />,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </Box>
  );
}
