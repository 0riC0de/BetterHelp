import type { Machine } from "../model";

export interface MachineCardProps {
  machine: Machine;
  waking: boolean;
  onWake: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
