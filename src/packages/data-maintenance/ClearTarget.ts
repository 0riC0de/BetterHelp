export const CLEAR_TARGETS = [
  "archived_tickets",
  "all_tickets",
  "message_history",
  "ticket_media",
  "profile_pictures",
  "wake_attempts",
  "expired_refresh_tokens",
  "inventory",
] as const;

export type ClearTarget = (typeof CLEAR_TARGETS)[number];

export function isClearTarget(value: unknown): value is ClearTarget {
  return typeof value === "string" && CLEAR_TARGETS.includes(value as ClearTarget);
}
