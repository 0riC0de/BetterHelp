import { Box, Card, Skeleton, Stack } from "@mui/material";

export default function LoginPageSkeleton() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#f8fafc", p: 3 }}>
      <Card sx={{ width: "100%", maxWidth: 450, p: 5 }}>
        <Stack spacing={2.5}>
          <Skeleton variant="circular" width={42} height={42} />
          <Skeleton width="70%" height={48} />
          <Skeleton width="90%" />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={48} />
        </Stack>
      </Card>
    </Box>
  );
}
