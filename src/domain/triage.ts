export const TRIAGE_CLASSIFICATIONS = [
  "CAN_AUTO_FIX",
  "NEEDS_REMOTE_TAKEOVER",
  "MANUAL_VISIT_REQUIRED",
] as const;

export type TriageClassification = (typeof TRIAGE_CLASSIFICATIONS)[number];
export type NonAutomaticClassification = Exclude<
  TriageClassification,
  "CAN_AUTO_FIX"
>;

export const AUTO_FIX_SCRIPTS = [
  "restart_spooler",
  "flush_dns",
  "renew_dhcp",
  "clear_temp",
] as const;

export type AutoFixScript = (typeof AUTO_FIX_SCRIPTS)[number];

export const REMEDIATION_SCRIPTS = [...AUTO_FIX_SCRIPTS, "none"] as const;

export type RemediationScript = (typeof REMEDIATION_SCRIPTS)[number];

interface TriageResultBase {
  confidenceScore: number;
  userFriendlySummary: string;
}

type WorkstationExtraction =
  | {
      pcNumber: number;
      needsPcClarification: false;
    }
  | {
      pcNumber: null;
      needsPcClarification: boolean;
    };

export type TriageResult =
  | (TriageResultBase &
      WorkstationExtraction & {
      classification: "CAN_AUTO_FIX";
      suggestedScript: AutoFixScript;
    })
  | (TriageResultBase &
      WorkstationExtraction & {
      classification: NonAutomaticClassification;
      suggestedScript: "none";
    });

const classificationValues: ReadonlySet<string> = new Set(
  TRIAGE_CLASSIFICATIONS,
);
const autoFixScriptValues: ReadonlySet<string> = new Set(AUTO_FIX_SCRIPTS);

export function isTriageClassification(
  value: unknown,
): value is TriageClassification {
  return typeof value === "string" && classificationValues.has(value);
}

export function isAutoFixScript(value: unknown): value is AutoFixScript {
  return typeof value === "string" && autoFixScriptValues.has(value);
}
