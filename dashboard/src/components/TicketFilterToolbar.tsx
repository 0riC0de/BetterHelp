import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import {
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";

import type { TicketFiltersState, TicketStatus } from "@/types/ticket";

const statusTabs: ReadonlyArray<{ value: "all" | TicketStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

interface TicketFilterToolbarProps {
  filters: TicketFiltersState;
  autoRefresh: boolean;
  isRefreshing: boolean;
  onStatusChange: (status: "all" | TicketStatus) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => Promise<void>;
}

export default function TicketFilterToolbar({
  filters,
  autoRefresh,
  isRefreshing,
  onStatusChange,
  onAutoRefreshChange,
  onRefresh,
}: TicketFilterToolbarProps) {
  return (
    <Stack
      direction={{ xs: "column", lg: "row" }}
      sx={{
        alignItems: { xs: "stretch", lg: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Tabs
        value={filters.status}
        onChange={(_event, value: "all" | TicketStatus) => onStatusChange(value)}
        variant="scrollable"
        scrollButtons={false}
        aria-label="Filter tickets by status"
      >
        {statusTabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end" }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(event) => onAutoRefreshChange(event.target.checked)}
            />
          }
          label="Fallback auto-refresh"
        />
        <Tooltip title="Refresh tickets">
          <span>
            <IconButton
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              aria-label="Refresh tickets"
            >
              <RefreshOutlined />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
