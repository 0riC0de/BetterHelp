import type { Technician } from "@/types/auth";
import type { ConnectionStatus } from "@/types/realtime";

export interface HeaderProps {
  technician: Technician;
  connectionStatus: ConnectionStatus;
  onOpenNavigation: () => void;
  onLogout: () => Promise<void>;
}
