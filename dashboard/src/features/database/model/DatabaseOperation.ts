import type { ClearTarget } from "./ClearTarget";

export interface DatabaseOperation {
  target: ClearTarget;
  title: string;
  description: string;
  count: number;
}
