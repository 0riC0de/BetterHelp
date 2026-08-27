import { request } from "@/services/api";
import type { Queue, QueueInput, QueueListResponse } from "../model";

export async function getQueues(): Promise<Queue[]> {
  return (await request<QueueListResponse>("/api/queues")).queues;
}

export function createQueue(input: QueueInput): Promise<Queue> {
  return request<Queue>("/api/queues", { method: "POST", body: JSON.stringify(input) });
}

export function updateQueue(queueId: number, input: QueueInput): Promise<Queue> {
  return request<Queue>(`/api/queues/${queueId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteQueue(queueId: number): Promise<void> {
  return request<void>(`/api/queues/${queueId}`, { method: "DELETE" });
}
