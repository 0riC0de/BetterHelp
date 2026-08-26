"use client";

import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";

import type { NavigationDrawerProps } from "./NavigationDrawerProps";

export default function NavigationDrawer({ open, role, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = [
    { label: "Tickets", path: "/", icon: <ConfirmationNumberOutlined /> },
    { label: "Operations", path: "/overview", icon: <SpaceDashboardOutlined /> },
    ...(role === "ADMIN"
      ? [
          { label: "Workspace", path: "/workspace", icon: <DesktopWindowsOutlined /> },
          { label: "Database", path: "/database", icon: <StorageOutlined /> },
          { label: "User management", path: "/users", icon: <ManageAccountsOutlined /> },
        ]
      : []),
  ];

  function navigate(path: string): void {
    router.push(path);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <Box sx={{ width: 280, p: 2 }} role="navigation" aria-label="Main navigation">
        <Typography variant="overline" color="text.secondary" sx={{ px: 1 }}>
          Navigate
        </Typography>
        <List>
          {items.map((item) => (
            <ListItemButton
              key={item.path}
              selected={item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
