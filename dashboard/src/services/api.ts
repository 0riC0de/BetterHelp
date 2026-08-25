import type { AuthResponse, Technician } from "@/types/auth";
import type {
  AiDecision,
  HealthResponse,
  Ticket,
  TicketListResponse,
  TicketConversation,
  TicketMessage,
  TicketStatus,
} from "@/types/ticket";
import type {
  CreateTechnicianInput,
  ManagedTechnician,
  TechnicianListResponse,
} from "@/types/technician";
import type { Machine, MachineInput } from "@/types/machine";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<Technician> | undefined;
let isLoggingOut = false;

async function readError(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null);
  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}`;
  return new ApiError(response.status, message);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    throw new ApiError(
      0,
      error instanceof DOMException && error.name === "TimeoutError"
        ? "The backend did not respond in time"
        : "Unable to reach the backend",
    );
  }

  if (response.status === 401 && canRefresh) {
    await refreshSession();
    return request<T>(path, options, false);
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<Technician> {
  isLoggingOut = false;
  const response = await request<AuthResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  return response.technician;
}

export async function refreshSession(): Promise<Technician> {
  if (isLoggingOut) throw new ApiError(401, "Session is ending");

  refreshPromise ??= refreshWithCrossTabLock()
    .finally(() => {
      refreshPromise = undefined;
    });
  return refreshPromise;
}

export async function logout(): Promise<void> {
  isLoggingOut = true;
  try {
    await refreshPromise?.catch(() => undefined);
    await withSessionLock(() =>
      request<void>("/api/auth/logout", { method: "POST" }, false),
    );
  } finally {
    isLoggingOut = false;
  }
}

async function refreshWithCrossTabLock(): Promise<Technician> {
  async function refresh(): Promise<Technician> {
    if (isLoggingOut) throw new ApiError(401, "Session is ending");

    try {
      const current = await request<AuthResponse>("/api/auth/me", {}, false);
      return current.technician;
    } catch (error: unknown) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }

    try {
      const response = await request<AuthResponse>(
        "/api/auth/refresh",
        { method: "POST" },
        false,
      );
      return response.technician;
    } catch (error: unknown) {
      if (!(error instanceof ApiError) || error.status !== 409) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
      const current = await request<AuthResponse>("/api/auth/me", {}, false);
      return current.technician;
    }
  }

  return withSessionLock(refresh);
}

async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("helpdesk-session-refresh", operation);
  }
  return operation();
}

export async function getCurrentTechnician(): Promise<Technician> {
  const response = await request<AuthResponse>("/api/auth/me");
  return response.technician;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", {}, false);
}

export function getTickets(filters?: {
  status?: TicketStatus;
  classification?: AiDecision;
  archive?: "active" | "archived" | "all";
}): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (filters?.status) query.set("status", filters.status);
  if (filters?.classification) query.set("classification", filters.classification);
  if (filters?.archive) query.set("archive", filters.archive);
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<TicketListResponse>(`/api/tickets${suffix}`);
}

export function updateTicketStatus(
  ticketId: number,
  status: TicketStatus,
): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateTicketArchive(ticketId: number, archived: boolean): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived }),
  });
}

export function getTicket(ticketId: number): Promise<TicketConversation> {
  return request<TicketConversation>(`/api/tickets/${ticketId}`);
}

export function sendTicketMessage(
  ticketId: number,
  text: string,
  clientRequestId: string,
): Promise<TicketMessage> {
  return request<TicketMessage>(`/api/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, clientRequestId }),
    signal: AbortSignal.timeout(45_000),
  });
}

export async function getTechnicians(): Promise<ManagedTechnician[]> {
  const response = await request<TechnicianListResponse>("/api/technicians");
  return response.technicians;
}

export function createTechnician(
  input: CreateTechnicianInput,
): Promise<ManagedTechnician> {
  return request<ManagedTechnician>("/api/technicians", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteTechnician(technicianId: number): Promise<void> {
  return request<void>(`/api/technicians/${technicianId}`, { method: "DELETE" });
}

export function resetTechnicianPassword(
  technicianId: number,
  password: string,
): Promise<void> {
  return request<void>(`/api/technicians/${technicianId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export async function getMachines(): Promise<Machine[]> {
  const response = await request<{ machines: Machine[] }>("/api/machines");
  return response.machines;
}

export function createMachine(input: MachineInput): Promise<Machine> {
  return request<Machine>("/api/machines", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMachine(machineId: number, input: MachineInput): Promise<Machine> {
  return request<Machine>(`/api/machines/${machineId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMachine(machineId: number): Promise<void> {
  return request<void>(`/api/machines/${machineId}`, { method: "DELETE" });
}

export function wakeMachine(machineId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/machines/${machineId}/wake`, {
    method: "POST",
  });
}

export { API_URL };
