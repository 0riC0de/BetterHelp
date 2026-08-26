"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/services/api";
import { clearDatabaseData, getDatabaseSummary } from "../api/databaseApi";
import type { ClearTarget, DatabaseSummary } from "../model";

export function useDatabaseMaintenance(enabled = true) {
  const [summary, setSummary] = useState<DatabaseSummary | null>(null);
  const [pendingTarget, setPendingTarget] = useState<ClearTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      setSummary(await getDatabaseSummary());
      setError(null);
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : "Database summary could not be loaded");
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, [enabled]);

  async function clear(target: ClearTarget): Promise<void> {
    const confirmation = window.prompt(`Type DELETE ${target} to continue`);
    if (confirmation !== `DELETE ${target}`) return;
    setPendingTarget(target);
    try {
      const result = await clearDatabaseData(target, confirmation);
      setNotice(`${result.affectedRows} rows affected`);
      await refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : "Database data could not be cleared");
    } finally {
      setPendingTarget(null);
    }
  }

  return { summary, pendingTarget, error, notice, setNotice, clear };
}
