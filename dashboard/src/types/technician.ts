import type { TechnicianRole } from "./auth";

export interface ManagedTechnician {
  id: number;
  email: string;
  name: string;
  role: TechnicianRole;
  isActive: boolean;
  createdAt: string;
}

export interface TechnicianListResponse {
  technicians: ManagedTechnician[];
}

export interface CreateTechnicianInput {
  email: string;
  name: string;
  password: string;
  role: TechnicianRole;
}
