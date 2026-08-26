"use client";

import { useEffect, useState } from "react";

import { getProfilePictureBlob } from "../api/ticketApi";

export function useProfilePicture(chatId: string | null, cacheKey: string | null): string | undefined {
  const [source, setSource] = useState<string>();

  useEffect(() => {
    if (!chatId) return;
    let objectUrl: string | undefined;
    let isActive = true;
    const task = window.setTimeout(() => {
      setSource(undefined);
      void getProfilePictureBlob(chatId).then((blob) => {
        if (!isActive) return;
        if (!blob.size) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      }).catch(() => undefined);
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(task);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheKey, chatId]);

  return source;
}
