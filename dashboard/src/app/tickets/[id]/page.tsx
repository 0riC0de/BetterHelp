"use client";

import { useParams } from "next/navigation";

import AppShell from "@/components/AppShell";
import TicketConversationView from "@/components/TicketConversationView";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  return <AppShell><TicketConversationView ticketId={Number(params.id)} /></AppShell>;
}
