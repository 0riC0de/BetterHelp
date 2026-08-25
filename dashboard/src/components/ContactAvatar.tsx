import { Avatar } from "@mui/material";

import type { Ticket } from "@/types/ticket";
import { API_URL } from "@/services/api";

function avatarSrc(ticket: Ticket): string | undefined {
  if (!ticket.profilePictureUrl || !ticket.chatId) return undefined;
  const encoded = encodeURIComponent(ticket.chatId);
  return `${API_URL}/api/profile-picture/${encoded}`;
}

export default function ContactAvatar({ ticket, size = 42 }: { ticket: Ticket; size?: number }) {
  const fallback = (ticket.userName ?? ticket.userPhone).trim()[0]?.toUpperCase() ?? "?";
  return (
    <Avatar
      src={avatarSrc(ticket)}
      alt={ticket.userName ?? ticket.userPhone}
      sx={{ width: size, height: size, bgcolor: "#d7f5e3", color: "#075e54" }}
    >
      {fallback}
    </Avatar>
  );
}
