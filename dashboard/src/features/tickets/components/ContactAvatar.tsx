import { Avatar } from "@mui/material";

import { useProfilePicture } from "../hooks/useProfilePicture";
import type { ContactAvatarProps } from "./ContactAvatarProps";

export default function ContactAvatar({ ticket, size = 42 }: ContactAvatarProps) {
  const source = useProfilePicture(
    ticket.chatId,
    `${ticket.profilePictureUrl ?? ""}:${ticket.hasProfilePicture}:${ticket.updatedAt}`,
    ticket.hasProfilePicture || Boolean(ticket.profilePictureUrl),
  );
  const fallback = (ticket.userName ?? ticket.userPhone).trim()[0]?.toUpperCase() ?? "?";
  return (
    <Avatar
      src={source}
      alt={ticket.userName ?? ticket.userPhone}
      sx={{ width: size, height: size, bgcolor: "#d7f5e3", color: "#075e54" }}
    >
      {fallback}
    </Avatar>
  );
}
