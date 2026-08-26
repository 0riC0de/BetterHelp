import { request } from "@/services/api";
import type { CreateTechnicianInput, ManagedTechnician, TechnicianListResponse } from "../model";

export async function getTechnicians(): Promise<ManagedTechnician[]> {
  return (await request<TechnicianListResponse>("/api/technicians")).technicians;
}

export function createTechnician(input: CreateTechnicianInput): Promise<ManagedTechnician> {
  return request<ManagedTechnician>("/api/technicians", { method: "POST", body: JSON.stringify(input) });
}

export function deleteTechnician(technicianId: number): Promise<void> {
  return request<void>(`/api/technicians/${technicianId}`, { method: "DELETE" });
}

export function resetTechnicianPassword(technicianId: number, password: string): Promise<void> {
  return request<void>(`/api/technicians/${technicianId}/password`, { method: "PATCH", body: JSON.stringify({ password }) });
}
