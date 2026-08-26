import DeleteSweepOutlined from "@mui/icons-material/DeleteSweepOutlined";
import { Button, Card, Stack, Typography } from "@mui/material";

import type { DatabaseClearCardProps } from "./DatabaseClearCardProps";

export default function DatabaseClearCard(props: DatabaseClearCardProps) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <div><Typography sx={{ fontWeight: 750 }}>{props.title}</Typography><Typography variant="body2" color="text.secondary">{props.description}</Typography></div>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5">{props.count}</Typography>
          <Button color="error" variant="outlined" startIcon={<DeleteSweepOutlined />} disabled={!props.count || props.isPending} onClick={() => props.onClear(props.target)}>
            Clear
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
