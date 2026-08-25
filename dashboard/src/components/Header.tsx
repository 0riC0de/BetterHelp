"use client";

import LanOutlined from "@mui/icons-material/LanOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import type { Technician } from "@/types/auth";
import type { ConnectionStatus } from "@/types/realtime";

interface HeaderProps {
  technician: Technician;
  connectionStatus: ConnectionStatus;
  onOpenNavigation: () => void;
  onLogout: () => Promise<void>;
}

export default function Header({ technician, connectionStatus, onOpenNavigation, onLogout }: HeaderProps) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const initials = technician.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const connection = {
    live: { label: "Live", color: "#22c55e" },
    syncing: { label: "Syncing", color: "#38bdf8" },
    reconnecting: { label: "Reconnecting", color: "#f59e0b" },
    polling: { label: "REST fallback", color: "#f59e0b" },
    offline: { label: "Offline", color: "#ef4444" },
  }[connectionStatus];

  function openProfile(event: MouseEvent<HTMLElement>): void {
    setAnchor(event.currentTarget);
  }

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 72, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
            <IconButton onClick={onOpenNavigation} aria-label="Open navigation">
              <MenuOutlined />
            </IconButton>
            <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
              <LanOutlined />
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
              <Typography variant="h6" noWrap>Helpdesk Operations</Typography>
              <Typography variant="caption" color="text.secondary">Technician command center</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} aria-label={`Connection status: ${connection.label}`}>
            <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: connection.color, boxShadow: `0 0 0 3px ${connection.color}22` }} />
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 700 }}>{connection.label}</Typography>
          </Stack>
          <ButtonBase
            onClick={openProfile}
            aria-haspopup="menu"
            aria-label={`Open profile menu for ${technician.name}`}
            aria-expanded={Boolean(anchor)}
            sx={{ borderRadius: 3, p: 0.75, gap: 1 }}
          >
            <Avatar sx={{ width: 36, height: 36, fontSize: 13 }}>{initials}</Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{technician.name}</Typography>
              <Typography variant="caption" color="text.secondary">{technician.role}</Typography>
            </Box>
          </ButtonBase>
          </Stack>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
              <Typography sx={{ fontWeight: 700 }}>{technician.name}</Typography>
              <Typography variant="caption" color="text.secondary">{technician.email}</Typography>
            </Box>
            {technician.role === "ADMIN" && (
              <MenuItem onClick={() => { setAnchor(null); router.push("/users"); }}>
                <ListItemIcon><ManageAccountsOutlined fontSize="small" /></ListItemIcon>
                Manage users
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={() => { setAnchor(null); void onLogout(); }}>
              <ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
