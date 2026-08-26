import { request } from "@/services/api";
import type { ClearTarget, DatabaseSummary, DataMaintenanceResult } from "../model";

export function getDatabaseSummary(): Promise<DatabaseSummary> {
  return request<DatabaseSummary>("/api/admin/database");
}

export function clearDatabaseData(target: ClearTarget, confirmation: string): Promise<DataMaintenanceResult> {
  return request<DataMaintenanceResult>("/api/admin/database/clear", { method: "POST", body: JSON.stringify({ target, confirmation }) });
}
