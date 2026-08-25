import { Card, Skeleton, Stack } from "@mui/material";

export default function TicketConversationSkeleton() {
  return (
    <Card sx={{ p: 3, minHeight: 560 }}>
      <Skeleton width="45%" height={42} />
      <Stack spacing={2} sx={{ my: 4 }}>
        <Skeleton variant="rounded" width="62%" height={72} />
        <Skeleton variant="rounded" width="55%" height={64} sx={{ alignSelf: "flex-end" }} />
        <Skeleton variant="rounded" width="70%" height={86} />
      </Stack>
      <Skeleton variant="rounded" height={72} />
    </Card>
  );
}
