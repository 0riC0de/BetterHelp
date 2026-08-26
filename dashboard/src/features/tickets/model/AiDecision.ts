export const AI_DECISIONS = [
  "CAN_AUTO_FIX",
  "NEEDS_REMOTE_TAKEOVER",
  "MANUAL_VISIT_REQUIRED",
] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];
