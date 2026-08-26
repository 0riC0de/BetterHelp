import { Box, Card, Container, Skeleton, Stack } from "@mui/material";

import type { LoadingSkeletonProps } from "./LoadingSkeletonProps";

export default function LoadingSkeleton({
  variant = "page",
  rows = 3,
  height = 72,
}: LoadingSkeletonProps) {
  if (variant === "inline") return <Skeleton variant="rounded" width={150} height={28} />;

  if (variant === "shell") {
    return (
      <Box sx={{ minHeight: "100vh" }}>
        <Stack direction="row" sx={{ height: 72, px: 3, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
          <Skeleton variant="rounded" width={220} height={42} />
          <Skeleton variant="circular" width={38} height={38} />
        </Stack>
        <Container maxWidth="xl" sx={{ py: 4 }}><LoadingSkeleton variant="page" rows={2} /></Container>
      </Box>
    );
  }

  if (variant === "form") {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
        <Card sx={{ width: "100%", maxWidth: 450, p: 5 }}><LoadingSkeleton variant="list" rows={5} height={48} /></Card>
      </Box>
    );
  }

  if (variant === "conversation") {
    return (
      <Stack spacing={2} sx={{ height: "100%", p: 3 }}>
        <Skeleton width="45%" height={42} />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} variant="rounded" width={`${55 + index * 7}%`} height={height} sx={{ alignSelf: index % 2 ? "flex-end" : "flex-start" }} />
        ))}
        <Skeleton variant="rounded" height={64} sx={{ mt: "auto" }} />
      </Stack>
    );
  }

  if (variant === "list") {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="rounded" height={height} />)}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Skeleton width={280} height={52} />
      <Skeleton width="55%" />
      <LoadingSkeleton variant="list" rows={rows} height={height} />
    </Stack>
  );
}
