export interface ResetPasswordDialogProps {
  open: boolean;
  technicianId: number;
  technicianName: string;
  onClose: () => void;
  onReset: (technicianId: number, password: string) => Promise<void>;
}
