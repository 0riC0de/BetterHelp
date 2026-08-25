import { createSocket } from "node:dgram";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { getErrorMessage } from "../utils/errors.js";
import { getMachineForWake, normalizeMacAddress } from "./inventory.service.js";

export function buildMagicPacket(macAddress: string): Buffer {
  const mac = Buffer.from(normalizeMacAddress(macAddress), "hex");
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array.from({ length: 16 }, () => mac)]);
}

async function sendPacket(packet: Buffer, address: string, port: number): Promise<void> {
  const socket = createSocket("udp4");
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(0, () => {
        socket.setBroadcast(true);
        socket.send(packet, port, address, (error) => error ? reject(error) : resolve());
      });
    });
  } finally {
    socket.close();
  }
}

export async function wakeMachine(machineId: number, technicianId: number): Promise<void> {
  const machine = await getMachineForWake(machineId);
  const target = `${machine.broadcastAddress}:${machine.wolPort}`;
  try {
    await sendPacket(buildMagicPacket(machine.macAddress), machine.broadcastAddress, machine.wolPort);
    await prisma.wakeAttempt.create({
      data: {
        machineId,
        technicianId,
        status: "PACKET_SENT",
        macAddressSnapshot: machine.macAddress,
        targetSnapshot: target,
      },
    });
  } catch (error: unknown) {
    const reason = getErrorMessage(error).slice(0, 500);
    await prisma.wakeAttempt.create({
      data: {
        machineId,
        technicianId,
        status: "SEND_FAILED",
        macAddressSnapshot: machine.macAddress,
        targetSnapshot: target,
        error: reason,
      },
    });
    throw new HttpError(503, `Wake packet could not be sent: ${reason}`);
  }
}
