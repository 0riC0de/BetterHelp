import { Container, Skeleton, Stack } from "@mui/material";

import TicketSkeleton from "./TicketSkeleton";

export default function DashboardSkeleton() {
  return (
    <Container component="main" maxWidth="xl" sx={{ py: 4 }}>
      <Skeleton width={280} height={52} />
      <Skeleton width="55%" />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ my: 3 }}>
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} variant="rounded" height={110} sx={{ flex: 1 }} />)}
      </Stack>
      <Skeleton variant="rounded" height={150} sx={{ mb: 3 }} />
      <Stack spacing={2}>{[1, 2, 3].map((item) => <TicketSkeleton key={item} />)}</Stack>
    </Container>
  );
}
