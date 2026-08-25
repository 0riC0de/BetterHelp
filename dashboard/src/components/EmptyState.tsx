import SearchOffOutlined from "@mui/icons-material/SearchOffOutlined";
import { Box, Button, Typography } from "@mui/material";

export default function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 4,
        bgcolor: "background.paper",
        py: 8,
        px: 2,
        textAlign: "center",
      }}
    >
      <SearchOffOutlined sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
      <Typography variant="h6">No matching tickets</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Try a broader search or clear the active filters.
      </Typography>
      <Button variant="outlined" onClick={onClear}>
        Clear Filters
      </Button>
    </Box>
  );
}
