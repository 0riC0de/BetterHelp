import { Box, Container, Skeleton, Stack } from "@mui/material";

export default function AppShellSkeleton() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ height: 72, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="xl" sx={{ height: "100%" }}>
          <Stack direction="row" sx={{ height: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <Skeleton variant="rounded" width={220} height={42} />
            <Skeleton variant="circular" width={38} height={38} />
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton width="32%" height={48} />
        <Skeleton width="55%" />
        <Skeleton variant="rounded" height={180} sx={{ mt: 4 }} />
        <Skeleton variant="rounded" height={260} sx={{ mt: 3 }} />
      </Container>
    </Box>
  );
}
