"use client";

import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import { Alert, Box, Button, Card, Container, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useTicketConversation } from "@/hooks/useTicketConversation";

import MessageBubble from "./MessageBubble";
import StatusChip from "./StatusChip";
import TicketConversationSkeleton from "./TicketConversationSkeleton";

export default function TicketConversationView({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const conversation = useTicketConversation(ticketId);
  const [text, setText] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    if (await conversation.send(message)) setText("");
  }

  if (conversation.isLoading) {
    return <Container maxWidth="md" sx={{ py: 4 }}><TicketConversationSkeleton /></Container>;
  }
  if (!conversation.ticket) {
    return <Container sx={{ py: 4 }}><Alert severity="error">{conversation.error ?? "Ticket not found"}</Alert></Container>;
  }
  const resolved = conversation.ticket.status === "resolved";

  return (
    <Container component="main" maxWidth="md" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => router.push("/")} aria-label="Back to tickets"><ArrowBackOutlined /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{conversation.ticket.userName ?? conversation.ticket.userPhone}</Typography>
          <Typography variant="body2" color="text.secondary">Ticket #{ticketId}</Typography>
        </Box>
        <StatusChip status={conversation.ticket.status} />
      </Stack>
      {conversation.error && <Alert severity="error" sx={{ mb: 2 }}>{conversation.error}</Alert>}
      <Card sx={{ height: { xs: "calc(100vh - 150px)", md: 650 }, minHeight: 500, display: "flex", flexDirection: "column" }}>
        <Stack spacing={2} aria-live="polite" sx={{ flex: 1, minHeight: 0, p: 2.5, overflowY: "auto" }}>
          {conversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
          <div ref={messageEndRef} />
        </Stack>
        <Box component="form" onSubmit={(event) => void submit(event)} sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          {resolved ? (
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography color="text.secondary">Reopen this ticket to continue the conversation.</Typography>
              <Button variant="contained" onClick={() => void conversation.reopen()}>Reopen</Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
              <TextField fullWidth multiline maxRows={5} label="Reply via WhatsApp" value={text} onChange={(e) => setText(e.target.value)} disabled={conversation.isSending} />
              <IconButton type="submit" color="primary" disabled={!text.trim() || conversation.isSending} aria-label="Send message"><SendOutlined /></IconButton>
            </Stack>
          )}
        </Box>
      </Card>
    </Container>
  );
}
