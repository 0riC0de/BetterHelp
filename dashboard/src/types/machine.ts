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
  department: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MachineInput {
  assetTag: string;
  name: string;
  location: string;
  department: string;
  macAddress: string;
  broadcastAddress: string;
  wolPort: number;
  hasProjector: boolean;
  hasPrinter: boolean;
  hasMonitor: boolean;
  hasSpeakers: boolean;
  notes: string;
}
