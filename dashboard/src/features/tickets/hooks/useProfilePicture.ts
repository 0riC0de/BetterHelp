"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/services/api";

export function useProfilePicture(chatId: string | null, cacheKey: string | null): string | undefined {
  const [source, setSource] = useState<string>();

  useEffect(() => {
    if (!chatId) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetch(`${API_URL}/api/profile-picture/${encodeURIComponent(chatId)}`, {
      credentials: "include",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      setSource(objectUrl);
    }).catch(() => undefined);

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheKey, chatId]);

  return source;
}
