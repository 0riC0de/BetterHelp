import type { Department } from "./Department";

export interface Machine {
  id: number;
  assetTag: string;
  name: string;
  location: string;
  macAddress: string;
  broadcastAddress: string;
  wolPort: number;
  hasProjector: boolean;
  hasPrinter: boolean;
  hasMonitor: boolean;
  hasSpeakers: boolean;
  notes: string | null;
  department: Department;
  createdAt: string;
  updatedAt: string;
}
