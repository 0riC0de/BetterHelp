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
