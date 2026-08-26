import type { Machine, MachineInput } from "../model";

export function toMachineInput(machine: Machine | null): MachineInput {
  if (!machine) {
    return { assetTag: "", name: "", location: "", department: "", macAddress: "", broadcastAddress: "255.255.255.255", wolPort: 9, hasProjector: false, hasPrinter: false, hasMonitor: false, hasSpeakers: false, notes: "" };
  }
  return {
    assetTag: machine.assetTag,
    name: machine.name,
    location: machine.location,
    department: machine.department.name,
    macAddress: machine.macAddress,
    broadcastAddress: machine.broadcastAddress,
    wolPort: machine.wolPort,
    hasProjector: machine.hasProjector,
    hasPrinter: machine.hasPrinter,
    hasMonitor: machine.hasMonitor,
    hasSpeakers: machine.hasSpeakers,
    notes: machine.notes ?? "",
  };
}
