import { io, type Socket } from "socket.io-client";

import type { ServerToClientEvents } from "@/types/realtime";

import { API_URL } from "./api";

type DashboardSocket = Socket<ServerToClientEvents, Record<string, never>>;

export function createDashboardSocket(): DashboardSocket {
  return io(`${API_URL}/dashboard`, {
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.4,
  });
}
