export const ACCESS_TOKEN_COOKIE = "helpdesk_access";
export const REFRESH_TOKEN_COOKIE = "helpdesk_refresh";

export const TECHNICIAN_ROLES = ["ADMIN", "TECHNICIAN"] as const;
export type TechnicianRole = (typeof TECHNICIAN_ROLES)[number];

export interface TechnicianProfile {
  id: number;
  email: string;
  name: string;
  role: TechnicianRole;
}

export interface AuthenticatedTechnician extends TechnicianProfile {
  accessTokenExpiresAt: number;
}
