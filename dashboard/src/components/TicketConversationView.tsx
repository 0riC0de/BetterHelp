"use client";

import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import { Alert, Box, Button, Card, Container, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useTicketConversation } from "@/hooks/useTicketConversation";
import { useConnectionStatus } from "@/providers/ConnectionStatusProvider";

import ContactAvatar from "./ContactAvatar";
import MessageBubble from "./MessageBubble";
import StatusChip from "./StatusChip";
import TicketConversationSkeleton from "./TicketConversationSkeleton";

interface TicketConversationViewProps {
  ticketId: number;
  embedded?: boolean;
  onBack?: () => void;
}

export default function TicketConversationView(props: TicketConversationViewProps) {
  const router = useRouter();
  const connection = useConnectionStatus();
  const conversation = useTicketConversation(props.ticketId);
  const [text, setText] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ block: "end" }); }, [conversation.messages]);
  useEffect(() => { connection.setStatus(conversation.connectionStatus); }, [connection, conversation.connectionStatus]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const message = text.trim();
    if (message && await conversation.send(message)) setText("");
  }

  if (conversation.isLoading) return props.embedded
    ? <TicketConversationSkeleton />
    : <Container maxWidth="md" sx={{ py: 4 }}><TicketConversationSkeleton /></Container>;
  if (!conversation.ticket) return <Alert severity="error">{conversation.error ?? "Ticket not found"}</Alert>;

  const ticket = conversation.ticket;
  const resolved = ticket.status === "resolved";
  const archived = Boolean(ticket.archivedAt);
  const content = (
    <Card elevation={props.embedded ? 0 : 1} sx={{ height: "100%", border: props.embedded ? 0 : undefined, borderRadius: props.embedded ? 0 : undefined, display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 2, borderBottom: 1, borderColor: "divider" }}>
        <IconButton onClick={props.onBack ?? (() => router.push("/"))} aria-label="Back to tickets" sx={{ display: { md: props.embedded ? "none" : "inline-flex" } }}><ArrowBackOutlined /></IconButton>
        <ContactAvatar ticket={ticket} />
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.userName ?? ticket.userPhone}</Typography><Typography variant="caption" color="text.secondary">Ticket #{ticket.id}</Typography></Box>
        <StatusChip status={ticket.status} />
      </Stack>
      {conversation.error && <Alert severity="error">{conversation.error}</Alert>}
      <Stack spacing={1} aria-live="polite" sx={{ flex: 1, minHeight: 0, p: { xs: 1.5, sm: 2.5 }, overflowY: "auto", bgcolor: "#efeae2", backgroundImage: "radial-gradient(rgba(11, 20, 26, 0.035) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
        {conversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        <div ref={messageEndRef} />
      </Stack>
      <Box component="form" onSubmit={(event) => void submit(event)} sx={{ p: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        {archived ? <Typography color="text.secondary" sx={{ textAlign: "center" }}>Unarchive this ticket to make changes.</Typography>
          : resolved ? <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Typography color="text.secondary">Reopen to continue this conversation.</Typography><Button onClick={() => void conversation.reopen()}>Reopen</Button></Stack>
          : <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}><TextField fullWidth multiline maxRows={5} label="Reply via WhatsApp" value={text} onChange={(event) => setText(event.target.value)} disabled={conversation.isSending} slotProps={{ htmlInput: { maxLength: 4000 } }} /><IconButton type="submit" color="primary" disabled={!text.trim() || conversation.isSending} aria-label="Send message"><SendOutlined /></IconButton></Stack>}
      </Box>
    </Card>
  );
  return props.embedded ? content : <Container component="main" maxWidth="md" sx={{ py: 3, height: "calc(100dvh - 72px)" }}>{content}</Container>;
}
