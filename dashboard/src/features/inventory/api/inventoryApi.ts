import { request } from "@/services/api";
import type { Machine, MachineInput } from "../model";

export async function getMachines(): Promise<Machine[]> {
  return (await request<{ machines: Machine[] }>("/api/machines")).machines;
}

export function createMachine(input: MachineInput): Promise<Machine> {
  return request<Machine>("/api/machines", { method: "POST", body: JSON.stringify(input) });
}

export function updateMachine(machineId: number, input: MachineInput): Promise<Machine> {
  return request<Machine>(`/api/machines/${machineId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMachine(machineId: number): Promise<void> {
  return request<void>(`/api/machines/${machineId}`, { method: "DELETE" });
}

export function wakeMachine(machineId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/machines/${machineId}/wake`, { method: "POST" });
}
