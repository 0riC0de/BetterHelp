export type TechnicianRole = "ADMIN" | "TECHNICIAN";

export interface Technician {
  id: number;
  email: string;
  name: string;
  role: TechnicianRole;
}

export interface AuthResponse {
  technician: Technician;
}

export type AuthenticationStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";
