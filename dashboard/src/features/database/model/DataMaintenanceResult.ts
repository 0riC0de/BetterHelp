import type { ClearTarget } from "./ClearTarget";

export interface DataMaintenanceResult {
  target: ClearTarget;
  affectedRows: number;
}
