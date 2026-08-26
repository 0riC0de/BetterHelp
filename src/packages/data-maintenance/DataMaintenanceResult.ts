import type { ClearTarget } from "./ClearTarget.js";

export interface DataMaintenanceResult {
  target: ClearTarget;
  affectedRows: number;
}
