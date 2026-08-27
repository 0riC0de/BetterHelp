"use client";

import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { Alert, Box, Button, Card, Chip, Container, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useTicketConversation } from "../hooks/useTicketConversation";
import { useConnectionStatus } from "@/providers/ConnectionStatusProvider";

import ContactAvatar from "./ContactAvatar";
import MessageBubble from "./MessageBubble";
import StatusChip from "./StatusChip";
import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import type { TicketConversationViewProps } from "./TicketConversationViewProps";

export default function TicketConversationView(props: TicketConversationViewProps) {
  const router = useRouter();
  const connection = useConnectionStatus();
  const conversation = useTicketConversation(props.ticketId);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ block: "end" }); }, [conversation.messages]);
  useEffect(() => { connection.setStatus(conversation.connectionStatus); }, [connection, conversation.connectionStatus]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const message = text.trim();
    const submittedAttachment = attachment;
    setText("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (submittedAttachment) {
      await conversation.sendMedia(submittedAttachment, message);
    } else if (message) {
      await conversation.send(message);
    }
  }

  if (conversation.isLoading) return props.embedded
    ? <LoadingSkeleton variant="conversation" />
    : <Container maxWidth="md" sx={{ py: 4 }}><LoadingSkeleton variant="conversation" /></Container>;
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
        <Chip
          size="small"
          label={ticket.queue?.name ?? "Unassigned"}
          variant={ticket.queue ? "filled" : "outlined"}
          sx={ticket.queue ? { bgcolor: ticket.queue.color, color: "common.white" } : undefined}
        />
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
          : <Stack spacing={1}>
              {attachment && <Chip label={`${attachment.name} (${Math.ceil(attachment.size / 1024)} KB)`} onDelete={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} deleteIcon={<CloseOutlined />} sx={{ alignSelf: "flex-start", maxWidth: "100%" }} />}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "flex-end" }}>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={(event) => setAttachment(event.target.files?.item(0) ?? null)}
                />
                <IconButton onClick={() => fileInputRef.current?.click()} disabled={conversation.isSending} aria-label="Attach media"><AttachFileOutlined /></IconButton>
                <TextField fullWidth multiline maxRows={5} label={attachment ? "Add a caption" : "Reply via WhatsApp"} value={text} onChange={(event) => setText(event.target.value)} disabled={conversation.isSending} slotProps={{ htmlInput: { maxLength: 4000 } }} />
                <IconButton type="submit" color="primary" disabled={(!text.trim() && !attachment) || conversation.isSending} aria-label="Send message"><SendOutlined /></IconButton>
              </Stack>
            </Stack>}
      </Box>
    </Card>
  );
  return props.embedded ? content : <Container component="main" maxWidth="md" sx={{ py: 3, height: "calc(100dvh - 72px)" }}>{content}</Container>;
}
