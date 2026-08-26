"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/services/api";
import { createTechnician, deleteTechnician, getTechnicians, resetTechnicianPassword } from "../api/technicianApi";
import type { CreateTechnicianInput, ManagedTechnician } from "../model";

export function useTechnicians(enabled = true) {
  const [technicians, setTechnicians] = useState<ManagedTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let isActive = true;
    void getTechnicians()
      .then((result) => { if (isActive) setTechnicians(result); })
      .catch((requestError: unknown) => { if (isActive) setError(getMessage(requestError, "Users could not be loaded")); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [enabled]);

  async function create(input: CreateTechnicianInput): Promise<boolean> {
    setIsSaving(true);
    try {
      const technician = await createTechnician(input);
      setTechnicians((current) => [...current, technician]);
      setError(null);
      return true;
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "User could not be created"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(technician: ManagedTechnician): Promise<void> {
    if (!window.confirm(`Delete ${technician.name}?`)) return;
    try {
      await deleteTechnician(technician.id);
      setTechnicians((current) => current.filter((candidate) => candidate.id !== technician.id));
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "User could not be deleted"));
    }
  }

  async function resetPassword(technicianId: number, password: string): Promise<void> {
    await resetTechnicianPassword(technicianId, password);
  }

  return { technicians, isLoading, isSaving, error, create, remove, resetPassword };
}

function getMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
