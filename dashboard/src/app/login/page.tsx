"use client";

import { type FormEvent, useEffect, useState } from "react";
import LanOutlined from "@mui/icons-material/LanOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";

import { ApiError } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/");
  }, [auth.status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await auth.login(email, password);
      router.replace("/");
    } catch (loginError: unknown) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : "Sign in could not be completed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(360px, 0.8fr) 1.2fr" },
        bgcolor: "#071827",
      }}
    >
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 7,
          color: "white",
          background:
            "radial-gradient(circle at 20% 15%, rgba(37,211,102,.23), transparent 35%), linear-gradient(145deg, #08253c, #071827)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "#25D366", color: "#071827" }}><LanOutlined /></Avatar>
          <Typography variant="h6">Helpdesk Operations</Typography>
        </Stack>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, maxWidth: 520, lineHeight: 1.08 }}>
            Every support request, triaged and moving.
          </Typography>
          <Typography sx={{ mt: 2, color: "#b8c9d8", maxWidth: 500 }}>
            Secure access to live WhatsApp intake, Gemini classifications, and
            one-click ticket resolution.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "#7690a4" }}>
          Authorized technicians only
        </Typography>
      </Box>

      <Box sx={{ display: "grid", placeItems: "center", p: 3, bgcolor: "#f8fafc" }}>
        <Card sx={{ width: "100%", maxWidth: 450 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", mb: 2 }}>
              <LockOutlined />
            </Avatar>
            <Typography variant="h4">Technician sign in</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
              Use your helpdesk administrator credentials.
            </Typography>
            <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
              <Stack spacing={2.5}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  type="email"
                  label="Email address"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
                <TextField
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={17} color="inherit" /> : null}
                >
                  {isSubmitting ? "Signing in" : "Sign in"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
