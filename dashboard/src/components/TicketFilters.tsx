"use client";

import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Card,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";

import type { AiDecision, TicketFiltersState } from "@/types/ticket";

import TicketFilterToolbar from "./TicketFilterToolbar";

interface TicketFiltersProps {
  filters: TicketFiltersState;
  resultCount: number;
  autoRefresh: boolean;
  isRefreshing: boolean;
  onChange: (filters: TicketFiltersState) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => Promise<void>;
}

const classifications: ReadonlyArray<{
  value: "all" | AiDecision;
  label: string;
}> = [
  { value: "all", label: "All Classifications" },
  { value: "CAN_AUTO_FIX", label: "CAN_AUTO_FIX" },
  { value: "NEEDS_REMOTE_TAKEOVER", label: "NEEDS_REMOTE_TAKEOVER" },
  { value: "MANUAL_VISIT_REQUIRED", label: "MANUAL_VISIT_REQUIRED" },
];

export default function TicketFilters({
  filters,
  resultCount,
  autoRefresh,
  isRefreshing,
  onChange,
  onAutoRefreshChange,
  onRefresh,
}: TicketFiltersProps) {
  function setFilter<Key extends keyof TicketFiltersState>(
    key: Key,
    value: TicketFiltersState[Key],
  ): void {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TicketFilterToolbar
          filters={filters}
          autoRefresh={autoRefresh}
          isRefreshing={isRefreshing}
          onStatusChange={(status) => setFilter("status", status)}
          onAutoRefreshChange={onAutoRefreshChange}
          onRefresh={onRefresh}
        />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            fullWidth
            value={filters.search}
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder="Search reporter, phone, PC, or issue keyword"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl sx={{ minWidth: { md: 290 } }}>
            <InputLabel id="classification-filter-label">AI Classification</InputLabel>
            <Select
              labelId="classification-filter-label"
              label="AI Classification"
              value={filters.classification}
              onChange={(event: SelectChangeEvent) =>
                setFilter("classification", event.target.value as "all" | AiDecision)
              }
            >
              {classifications.map((classification) => (
                <MenuItem key={classification.value} value={classification.value}>
                  {classification.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {resultCount} {resultCount === 1 ? "ticket" : "tickets"} shown
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}
