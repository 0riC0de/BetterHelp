import type { TechnicianRole } from "@/types/auth";

export interface NavigationDrawerProps {
  open: boolean;
  role: TechnicianRole;
  onClose: () => void;
}
