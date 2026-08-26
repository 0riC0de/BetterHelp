export interface DatabaseSummary {
  tickets: number;
  archivedTickets: number;
  messages: number;
  messagesWithMedia: number;
  profilePictures: number;
  machines: number;
  departments: number;
  wakeAttempts: number;
  expiredOrRevokedRefreshTokens: number;
}
