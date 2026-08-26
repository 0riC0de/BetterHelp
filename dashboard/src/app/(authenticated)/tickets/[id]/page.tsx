"use client";

import { Alert, Container } from "@mui/material";
import { useParams } from "next/navigation";

import TicketConversationView from "@/features/tickets/components/TicketConversationView";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = Number(params.id);
  if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
    return <Container sx={{ py: 4 }}><Alert severity="error">Invalid ticket ID.</Alert></Container>;
  }
  return <TicketConversationView ticketId={ticketId} />;
}
