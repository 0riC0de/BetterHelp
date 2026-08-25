import { Card, CardContent, Skeleton, Stack } from "@mui/material";

export default function TicketSkeleton() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Skeleton variant="circular" width={42} height={42} />
            <Stack sx={{ flex: 1 }}>
              <Skeleton width="28%" />
              <Skeleton width="20%" />
            </Stack>
            <Skeleton variant="rounded" width={110} height={28} />
          </Stack>
          <Skeleton width="18%" />
          <Skeleton height={30} width="75%" />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={180} height={28} />
            <Skeleton variant="rounded" width={110} height={28} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
