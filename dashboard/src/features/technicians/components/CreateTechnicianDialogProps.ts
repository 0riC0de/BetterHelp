import type { CreateTechnicianInput } from "../model";

export interface CreateTechnicianDialogProps {
  open: boolean;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onCreate: (input: CreateTechnicianInput) => Promise<void>;
}
