"use client";

import { Box, Snackbar } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/AuthProvider";
import { ConnectionStatusProvider, useConnectionStatus } from "@/providers/ConnectionStatusProvider";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import Header from "./Header";
import NavigationDrawer from "./NavigationDrawer";

function AuthenticatedShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth();
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const connection = useConnectionStatus();

  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace("/login");
  }, [auth.status, router]);

  async function handleLogout(): Promise<void> {
    try {
      await auth.logout();
    } catch {
      setLogoutError(true);
      return;
    }
    router.replace("/login");
  }

  if (auth.status !== "authenticated" || !auth.technician) {
    return <LoadingSkeleton variant="shell" />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Header
        technician={auth.technician}
        connectionStatus={connection.status}
        onOpenNavigation={() => setNavigationOpen(true)}
        onLogout={handleLogout}
      />
      <NavigationDrawer
        open={navigationOpen}
        role={auth.technician.role}
        onClose={() => setNavigationOpen(false)}
      />
      {children}
      <Snackbar
        open={logoutError}
        autoHideDuration={5_000}
        onClose={() => setLogoutError(false)}
        message="The server could not complete sign out"
      />
    </Box>
  );
}

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConnectionStatusProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </ConnectionStatusProvider>
  );
}
