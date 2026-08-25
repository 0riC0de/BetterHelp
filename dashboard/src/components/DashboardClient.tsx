"use client";

import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/AuthProvider";

import DashboardShell from "./DashboardShell";

export default function DashboardClient() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace("/login");
  }, [auth.status, router]);

  if (auth.status !== "authenticated" || !auth.technician) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress aria-label="Checking technician session" />
      </Box>
    );
  }

  return <DashboardShell technician={auth.technician} />;
}
