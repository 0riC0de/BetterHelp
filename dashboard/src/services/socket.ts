import { io, type Socket } from "socket.io-client";

import type { ServerToClientEvents } from "@/types/realtime";

import { API_URL } from "./api";

type DashboardSocket = Socket<ServerToClientEvents, Record<string, never>>;

function getSocketTransports(): Array<"polling" | "websocket"> {
  const configured = process.env.NEXT_PUBLIC_SOCKET_TRANSPORTS
    ?.split(",")
    .map((transport) => transport.trim())
    .filter((transport): transport is "polling" | "websocket" => transport === "polling" || transport === "websocket");
  return configured?.length ? configured : ["polling", "websocket"];
}

export function createDashboardSocket(): DashboardSocket {
  return io(`${API_URL}/dashboard`, {
    autoConnect: false,
    transports: getSocketTransports(),
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.4,
  });
}
