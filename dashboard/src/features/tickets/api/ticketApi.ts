import { request, requestBlob } from "@/services/api";
import type { AiDecision, HealthResponse, Ticket, TicketConversation, TicketListResponse, TicketMessage, TicketStatus } from "../model";

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", {}, false);
}

export function getTickets(filters?: { status?: TicketStatus; classification?: AiDecision; archive?: "active" | "archived" | "all" }): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (filters?.status) query.set("status", filters.status);
  if (filters?.classification) query.set("classification", filters.classification);
  if (filters?.archive) query.set("archive", filters.archive);
  return request<TicketListResponse>(`/api/tickets${query.size ? `?${query.toString()}` : ""}`);
}

export function updateTicketStatus(ticketId: number, status: TicketStatus): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function updateTicketArchive(ticketId: number, archived: boolean): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}/archive`, { method: "PATCH", body: JSON.stringify({ archived }) });
}

export function updateTicketQueue(ticketId: number, queueId: number | null): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}/queue`, { method: "PATCH", body: JSON.stringify({ queueId }) });
}

export function getTicket(ticketId: number): Promise<TicketConversation> {
  return request<TicketConversation>(`/api/tickets/${ticketId}`);
}

export function sendTicketMessage(ticketId: number, text: string, clientRequestId: string): Promise<TicketMessage> {
  return request<TicketMessage>(`/api/tickets/${ticketId}/messages`, { method: "POST", body: JSON.stringify({ text, clientRequestId }), signal: AbortSignal.timeout(45_000) });
}

export function sendTicketMedia(ticketId: number, file: File, caption: string, clientRequestId: string): Promise<TicketMessage> {
  const form = new FormData();
  form.append("media", file);
  form.append("caption", caption);
  form.append("clientRequestId", clientRequestId);
  return request<TicketMessage>(`/api/tickets/${ticketId}/media`, { method: "POST", body: form, signal: AbortSignal.timeout(90_000) });
}

export function getTicketMessageMediaBlob(ticketId: number, messageId: number): Promise<Blob> {
  return requestBlob(`/api/tickets/${ticketId}/messages/${messageId}/media`, {
    signal: AbortSignal.timeout(45_000),
  });
}

export function getProfilePictureBlob(chatId: string): Promise<Blob> {
  return requestBlob(`/api/profile-picture/${encodeURIComponent(chatId)}`, {
    signal: AbortSignal.timeout(45_000),
  });
}
