import type { ClearTarget } from "../model";

export interface DatabaseClearCardProps {
  target: ClearTarget;
  title: string;
  description: string;
  count: number;
  isPending: boolean;
  onClear: (target: ClearTarget) => void;
}
