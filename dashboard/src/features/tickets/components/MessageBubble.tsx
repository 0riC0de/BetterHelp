"use client";

import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import { Box, Chip, Dialog, IconButton, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { API_URL } from "@/services/api";
import { formatAbsoluteTime } from "../helpers/formatAbsoluteTime";
import type { MessageBubbleProps } from "./MessageBubbleProps";

const MEDIA_PLACEHOLDERS = new Set(["[Image]", "[Audio]", "[Video]", "[Document]"]);

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const outbound = message.direction === "OUTBOUND";
  const mediaUrl = `${API_URL}/api/tickets/${message.ticketId}/messages/${message.id}/media`;
  const mimeType = message.mediaMimeType ?? "";
  const showCaption = !MEDIA_PLACEHOLDERS.has(message.body);

  return (
    <Box sx={{ alignSelf: outbound ? "flex-end" : "flex-start", maxWidth: { xs: "88%", sm: "72%" } }}>
      <Box
        dir="auto"
        sx={{
          bgcolor: outbound ? "#d9fdd3" : "background.paper",
          color: "text.primary",
          borderRadius: outbound ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
          p: message.hasMedia ? 0.5 : 1,
          boxShadow: "0 1px 1px rgba(11,20,26,.13)",
          overflowWrap: "anywhere",
        }}
      >
        {message.hasMedia && !mediaFailed && mimeType.startsWith("image/") && (
          <Box
            component="img"
            src={mediaUrl}
            alt={message.mediaFileName ?? "WhatsApp image"}
            onClick={() => setImageOpen(true)}
            onError={() => setMediaFailed(true)}
            sx={{ display: "block", maxWidth: "100%", maxHeight: 420, borderRadius: 1.5, cursor: "zoom-in" }}
          />
        )}
        {message.hasMedia && !mediaFailed && mimeType.startsWith("audio/") && (
          <Box component="audio" controls preload="metadata" src={mediaUrl} onError={() => setMediaFailed(true)} sx={{ display: "block", width: { xs: 230, sm: 320 }, maxWidth: "100%" }} />
        )}
        {message.hasMedia && !mediaFailed && mimeType.startsWith("video/") && (
          <Box component="video" controls preload="metadata" src={mediaUrl} onError={() => setMediaFailed(true)} sx={{ display: "block", width: 420, maxWidth: "100%", maxHeight: 420, borderRadius: 1.5 }} />
        )}
        {message.hasMedia && (mediaFailed || (!mimeType.startsWith("image/") && !mimeType.startsWith("audio/") && !mimeType.startsWith("video/"))) && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 220, p: 1 }}>
            <AttachFileOutlined color="action" />
            <Link href={mediaUrl} download={message.mediaFileName ?? true} sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {message.mediaFileName ?? "Download attachment"}
            </Link>
            <IconButton component="a" href={mediaUrl} download={message.mediaFileName ?? true} size="small" aria-label="Download attachment"><DownloadOutlined /></IconButton>
          </Stack>
        )}
        {showCaption && <Typography sx={{ whiteSpace: "pre-wrap", px: message.hasMedia ? 0.75 : 0, pt: message.hasMedia ? 0.75 : 0 }}>{message.body}</Typography>}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 0.75, pt: 0.25, textAlign: "right", whiteSpace: "nowrap" }}>
          {formatAbsoluteTime(message.sentAt ?? message.createdAt)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 0.25, justifyContent: outbound ? "flex-end" : "flex-start" }}>
        {message.deliveryStatus === "FAILED" && <Chip label="Failed" color="error" size="small" />}
        {message.deliveryStatus === "PENDING" && <Chip label="Sending" size="small" />}
      </Stack>
      <Dialog open={imageOpen} onClose={() => setImageOpen(false)} maxWidth="xl">
        <Box component="img" src={mediaUrl} alt={message.mediaFileName ?? "WhatsApp image"} sx={{ display: "block", maxWidth: "90vw", maxHeight: "90vh" }} />
      </Dialog>
    </Box>
  );
}
