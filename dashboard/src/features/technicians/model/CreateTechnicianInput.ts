import type { TechnicianRole } from "@/types/auth";

export interface CreateTechnicianInput {
  email: string;
  name: string;
  password: string;
  role: TechnicianRole;
}
