"use client";

import LanOutlined from "@mui/icons-material/LanOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";

import type { Technician } from "@/types/auth";
import type { ConnectionStatus } from "@/types/realtime";

const connectionPresentation: Record<
  ConnectionStatus,
  { label: string; color: string; background: string }
> = {
  live: { label: "Live", color: "#166534", background: "#dcfce7" },
  syncing: { label: "Syncing", color: "#075985", background: "#e0f2fe" },
  reconnecting: {
    label: "Reconnecting",
    color: "#9a3412",
    background: "#ffedd5",
  },
  polling: {
    label: "REST fallback",
    color: "#92400e",
    background: "#fef3c7",
  },
  offline: { label: "Offline", color: "#991b1b", background: "#fee2e2" },
};

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  technician: Technician;
  onLogout: () => Promise<void>;
}

export default function Header({
  connectionStatus,
  technician,
  onLogout,
}: HeaderProps) {
  const connection = connectionPresentation[connectionStatus];
  const initials = technician.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Box
      component="header"
      sx={{
        bgcolor: "rgba(255,255,255,0.9)",
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Container maxWidth="xl">
        <Stack
          direction="row"
          spacing={2}
          sx={{ minHeight: 76, alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 42, height: 42 }}>
              <LanOutlined />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                Helpdesk Operations
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Technician command center
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: "center" }}>
            <Chip
              size="small"
              label={connection.label}
              icon={
                <Box
                  component="span"
                  sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: connection.color }}
                />
              }
              sx={{ bgcolor: connection.background, color: connection.color }}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Avatar sx={{ width: 34, height: 34, fontSize: 13 }}>{initials}</Avatar>
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                  {technician.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {technician.role === "ADMIN" ? "Administrator" : "Technician"}
                </Typography>
              </Box>
            </Stack>
            <Button
              color="inherit"
              size="small"
              startIcon={<LogoutOutlined />}
              onClick={() => void onLogout()}
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
