import type { TechnicianRole } from "@/types/auth";

export interface ManagedTechnician {
  id: number;
  email: string;
  name: string;
  role: TechnicianRole;
  isActive: boolean;
  createdAt: string;
}
