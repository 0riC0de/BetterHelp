"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/services/api";
import { createQueue, deleteQueue, getQueues, updateQueue } from "../api/queueApi";
import type { Queue, QueueInput } from "../model";

export function useQueues(enabled = true) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let isActive = true;
    void getQueues()
      .then((result) => {
        if (isActive) setQueues(result);
      })
      .catch((requestError: unknown) => {
        if (isActive) setError(getMessage(requestError, "Queues could not be loaded"));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [enabled]);

  async function refresh(): Promise<void> {
    try {
      setQueues(await getQueues());
      setError(null);
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Queues could not be loaded"));
    }
  }

  async function create(input: QueueInput): Promise<boolean> {
    setIsSaving(true);
    try {
      const queue = await createQueue(input);
      setQueues((current) => {
        const next = queue.isDefault
          ? current.map((candidate) => ({ ...candidate, isDefault: false }))
          : current;
        return [...next, queue].sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name));
      });
      setError(null);
      return true;
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Queue could not be created"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function update(queueId: number, input: QueueInput): Promise<boolean> {
    setIsSaving(true);
    try {
      const queue = await updateQueue(queueId, input);
      setQueues((current) => {
        const others = current.filter((candidate) => candidate.id !== queue.id);
        const next = queue.isDefault ? others.map((candidate) => ({ ...candidate, isDefault: false })) : others;
        return [...next, queue].sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name));
      });
      setError(null);
      return true;
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Queue could not be updated"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(queue: Queue): Promise<void> {
    if (!window.confirm(`Delete ${queue.name}?`)) return;
    try {
      await deleteQueue(queue.id);
      setQueues((current) => current.filter((candidate) => candidate.id !== queue.id));
    } catch (requestError: unknown) {
      setError(getMessage(requestError, "Queue could not be deleted"));
    }
  }

  return { queues, isLoading, isSaving, error, refresh, create, update, remove };
}

function getMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
