import type { Machine, MachineInput } from "../model";

export interface MachineFormDialogProps {
  open: boolean;
  machine: Machine | null;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: MachineInput) => Promise<void>;
}
