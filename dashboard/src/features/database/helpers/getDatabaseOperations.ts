import type { DatabaseOperation, DatabaseSummary } from "../model";

export function getDatabaseOperations(summary: DatabaseSummary): DatabaseOperation[] {
  return [
    { target: "archived_tickets", title: "Archived tickets", description: "Deletes archived tickets and their messages.", count: summary.archivedTickets },
    { target: "all_tickets", title: "All tickets", description: "Deletes every ticket and message while preserving users.", count: summary.tickets },
    { target: "message_history", title: "Message history", description: "Deletes messages but keeps ticket records.", count: summary.messages },
    { target: "ticket_media", title: "Stored media", description: "Removes attachment bytes while preserving message text.", count: summary.messagesWithMedia },
    { target: "profile_pictures", title: "Profile references", description: "Clears cached WhatsApp profile references.", count: summary.profilePictures },
    { target: "wake_attempts", title: "Wake-on-LAN logs", description: "Deletes Wake-on-LAN audit entries.", count: summary.wakeAttempts },
    { target: "expired_refresh_tokens", title: "Expired sessions", description: "Deletes expired and revoked refresh tokens only.", count: summary.expiredOrRevokedRefreshTokens },
    { target: "inventory", title: "Inventory", description: `Deletes ${summary.machines} machines and ${summary.departments} departments.`, count: summary.machines + summary.departments },
  ];
}
