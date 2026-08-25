import { Card, Skeleton, Stack } from "@mui/material";

export default function UserManagementSkeleton() {
  return (
    <Stack spacing={2}>
      {[1, 2, 3].map((item) => (
        <Card key={item} sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Skeleton variant="circular" width={42} height={42} />
            <Stack sx={{ flex: 1 }}>
              <Skeleton width="35%" />
              <Skeleton width="55%" />
            </Stack>
            <Skeleton variant="rounded" width={90} height={36} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
