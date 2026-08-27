export interface Queue {
  id: number;
  name: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueInput {
  name: string;
  color: string;
  description: string | null;
  isDefault: boolean;
}
