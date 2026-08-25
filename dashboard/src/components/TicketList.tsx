import { Stack } from "@mui/material";

import type { Ticket, TicketFiltersState, TicketStatus } from "@/types/ticket";

import EmptyState from "./EmptyState";
import TicketCard from "./TicketCard";
import TicketSkeleton from "./TicketSkeleton";

interface TicketListProps {
  tickets: readonly Ticket[];
  isLoading: boolean;
  now: number;
  pendingTicketIds: ReadonlySet<number>;
  onStatusChange: (ticketId: number, status: TicketStatus) => Promise<void>;
  onClearFilters: () => void;
}

export const EMPTY_FILTERS: TicketFiltersState = {
  status: "all",
  classification: "all",
  search: "",
};

export default function TicketList({
  tickets,
  isLoading,
  now,
  pendingTicketIds,
  onStatusChange,
  onClearFilters,
}: TicketListProps) {
  if (isLoading) {
    return (
      <Stack spacing={2} aria-label="Loading tickets">
        {Array.from({ length: 3 }, (_value, index) => (
          <TicketSkeleton key={index} />
        ))}
      </Stack>
    );
  }

  if (!tickets.length) return <EmptyState onClear={onClearFilters} />;

  return (
    <Stack spacing={2}>
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          now={now}
          isPending={pendingTicketIds.has(ticket.id)}
          onStatusChange={onStatusChange}
        />
      ))}
    </Stack>
  );
}
