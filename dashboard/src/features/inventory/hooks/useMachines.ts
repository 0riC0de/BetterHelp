"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/services/api";
import { createMachine, deleteMachine, getMachines, updateMachine, wakeMachine } from "../api/inventoryApi";
import type { Machine, MachineInput } from "../model";

export function useMachines(enabled = true) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wakingId, setWakingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let isActive = true;
    void getMachines()
      .then((result) => { if (isActive) setMachines(result); })
      .catch((requestError: unknown) => { if (isActive) setError(getMessage(requestError, "Machines could not be loaded")); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [enabled]);

  async function save(input: MachineInput, existing: Machine | null): Promise<boolean> {
    setIsSaving(true);
    try {
      const result = existing ? await updateMachine(existing.id, input) : await createMachine(input);
      setMachines((current) => existing ? current.map((machine) => machine.id === result.id ? result : machine) : [...current, result]);
      setError(null);
      return true;
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Machine could not be saved"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(machine: Machine): Promise<void> {
    if (!window.confirm(`Delete ${machine.name}?`)) return;
    try {
      await deleteMachine(machine.id);
      setMachines((current) => current.filter((candidate) => candidate.id !== machine.id));
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Machine could not be deleted"));
    }
  }

  async function wake(machine: Machine): Promise<void> {
    setWakingId(machine.id);
    try {
      await wakeMachine(machine.id);
      setNotice(`Wake packet sent to ${machine.name}`);
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Wake packet failed"));
    } finally {
      setWakingId(null);
    }
  }

  return { machines, isLoading, isSaving, wakingId, error, notice, setNotice, save, remove, wake };
}

function getMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
