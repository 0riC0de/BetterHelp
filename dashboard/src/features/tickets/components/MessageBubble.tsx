"use client";

import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import { Box, Chip, Dialog, IconButton, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { formatAbsoluteTime } from "../helpers/formatAbsoluteTime";
import { useMessageMedia } from "../hooks/useMessageMedia";
import type { MessageBubbleProps } from "./MessageBubbleProps";
import AudioMediaPlayer from "./AudioMediaPlayer";

const MEDIA_PLACEHOLDERS = new Set(["[Image]", "[Audio]", "[Video]", "[Document]"]);

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const outbound = message.direction === "OUTBOUND";
  const media = useMessageMedia(message.ticketId, message.id, message.hasMedia);
  const mediaUrl = media.source;
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
        {message.hasMedia && media.isLoading && !mediaUrl && !mediaFailed && (
          <Typography color="text.secondary" sx={{ p: 1 }}>Loading media...</Typography>
        )}
        {message.hasMedia && (media.failed || mediaFailed) && !mediaUrl && (
          <Typography color="text.secondary" sx={{ p: 1 }}>Media unavailable</Typography>
        )}
        {message.hasMedia && mediaUrl && !mediaFailed && mimeType.startsWith("image/") && (
          <Box
            component="img"
            src={mediaUrl}
            alt={message.mediaFileName ?? "WhatsApp image"}
            onClick={() => setImageOpen(true)}
            onError={() => setMediaFailed(true)}
            sx={{ display: "block", maxWidth: "100%", maxHeight: 420, borderRadius: 1.5, cursor: "zoom-in" }}
          />
        )}
        {message.hasMedia && mediaUrl && !mediaFailed && mimeType.startsWith("audio/") && (
          <AudioMediaPlayer src={mediaUrl} label={message.mediaFileName ?? "Audio message"} />
        )}
        {message.hasMedia && mediaUrl && !mediaFailed && mimeType.startsWith("video/") && (
          <Box component="video" controls preload="metadata" src={mediaUrl} onError={() => setMediaFailed(true)} sx={{ display: "block", width: 420, maxWidth: "100%", maxHeight: 420, borderRadius: 1.5 }} />
        )}
        {message.hasMedia && mediaUrl && (mediaFailed || (!mimeType.startsWith("image/") && !mimeType.startsWith("audio/") && !mimeType.startsWith("video/"))) && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 220, p: 1 }}>
            <AttachFileOutlined color="action" />
            <Link href={mediaUrl} download={message.mediaFileName ?? true} sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {message.mediaFileName ?? "Download attachment"}
            </Link>
            <IconButton component="a" href={mediaUrl} download={message.mediaFileName ?? true} size="small" aria-label="Download attachment"><DownloadOutlined /></IconButton>
          </Stack>
        )}
        {showCaption && <Typography sx={{ whiteSpace: "pre-wrap", px: message.hasMedia ? 0.75 : 0, pt: message.hasMedia ? 0.75 : 0 }}>{message.body}</Typography>}
        {message.mediaError && (
          <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, bgcolor: "rgba(239,68,68,.08)", color: "error.dark" }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>Media failed: {message.mediaError}</Typography>
            {message.mediaMetadata && (
              <Typography component="pre" variant="caption" sx={{ m: 0, mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "text.secondary" }}>
                {JSON.stringify(message.mediaMetadata, null, 2)}
              </Typography>
            )}
          </Box>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 0.75, pt: 0.25, textAlign: "right", whiteSpace: "nowrap" }}>
          {formatAbsoluteTime(message.sentAt ?? message.createdAt)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 0.25, justifyContent: outbound ? "flex-end" : "flex-start" }}>
        {message.deliveryStatus === "FAILED" && <Chip label="Failed" color="error" size="small" />}
        {message.deliveryStatus === "PENDING" && <Chip label="Sending" size="small" />}
      </Stack>
      <Dialog open={imageOpen} onClose={() => setImageOpen(false)} maxWidth="xl">
        {mediaUrl && <Box component="img" src={mediaUrl} alt={message.mediaFileName ?? "WhatsApp image"} sx={{ display: "block", maxWidth: "90vw", maxHeight: "90vh" }} />}
      </Dialog>
    </Box>
  );
}
