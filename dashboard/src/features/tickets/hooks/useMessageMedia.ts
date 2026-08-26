"use client";

import { useEffect, useState } from "react";

import { getTicketMessageMediaBlob } from "../api/ticketApi";
import type { MessageMediaState } from "../model";

export function useMessageMedia(ticketId: number, messageId: number, enabled: boolean): MessageMediaState {
  const [state, setState] = useState<MessageMediaState>({ source: undefined, isLoading: false, failed: false });

  useEffect(() => {
    if (!enabled) return;
    let isActive = true;
    let objectUrl: string | undefined;
    const task = window.setTimeout(() => {
      setState({ source: undefined, isLoading: true, failed: false });
      void getTicketMessageMediaBlob(ticketId, messageId).then((blob) => {
        if (!isActive) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ source: objectUrl, isLoading: false, failed: false });
      }).catch(() => {
        if (isActive) setState({ source: undefined, isLoading: false, failed: true });
      });
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(task);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, messageId, ticketId]);

  return state;
}
