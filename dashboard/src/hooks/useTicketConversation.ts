"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { ApiError, getTicket, sendTicketMedia, sendTicketMessage, updateTicketStatus } from "@/services/api";
import type { Ticket, TicketMessage } from "@/types/ticket";

import { useTicketRealtime } from "./useTicketRealtime";

/** Generate a UUID v4, falling back for non-secure contexts (HTTP on LAN). */
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

function upsertMessage(messages: TicketMessage[], message: TicketMessage): TicketMessage[] {
  const index = messages.findIndex((candidate) => candidate.id === message.id);
  if (index === -1) return [...messages, message];
  const next = [...messages];
  next[index] = message;
  return next;
}

function mergeMessages(snapshot: TicketMessage[], current: TicketMessage[]): TicketMessage[] {
  return current
    .reduce((messages, message) => upsertMessage(messages, message), snapshot)
    .sort((left, right) => left.id - right.id);
}

export function useTicketConversation(ticketId: number) {
  const auth = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<import("@/types/realtime").ConnectionStatus>("syncing");
  const retryRequestRef = useRef<{ text: string; id: string } | null>(null);

  async function refresh(): Promise<void> {
    try {
      const conversation = await getTicket(ticketId);
      setTicket(conversation.ticket);
      setMessages((current) => mergeMessages(conversation.messages, current));
      setError(null);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) auth.invalidate();
      setError(requestError instanceof ApiError ? requestError.message : "Conversation could not be loaded");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;
    void getTicket(ticketId)
      .then((conversation) => {
        if (!isActive) return;
        setTicket(conversation.ticket);
        setMessages((current) => mergeMessages(conversation.messages, current));
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;
        setError(requestError instanceof ApiError ? requestError.message : "Conversation could not be loaded");
      })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [ticketId]);

  useTicketRealtime({
    onReady: () => void refresh(),
    onTicket: (event) => { if (event.ticket.id === ticketId) setTicket(event.ticket); },
    onMessage: (event) => {
      if (event.ticket.id !== ticketId) return;
      setTicket(event.ticket);
      setMessages((current) => upsertMessage(current, event.message));
    },
    onGap: () => void refresh(),
    onStatus: setConnectionStatus,
    onUnauthorized: auth.invalidate,
  });

  async function send(text: string): Promise<boolean> {
    setIsSending(true);
      const clientRequest =
      retryRequestRef.current?.text === text
        ? retryRequestRef.current
        : { text, id: generateUUID() };
    retryRequestRef.current = clientRequest;
    try {
      const message = await sendTicketMessage(ticketId, text, clientRequest.id);
      setMessages((current) => upsertMessage(current, message));
      setError(null);
      retryRequestRef.current = null;
      return true;
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) auth.invalidate();
      setError(requestError instanceof ApiError ? requestError.message : "Message could not be sent");
      await refresh();
      return false;
    } finally {
      setIsSending(false);
    }
  }

  async function sendMedia(file: File, caption: string): Promise<boolean> {
    if (file.size > 16 * 1024 * 1024) {
      setError("Media cannot exceed 16 MB");
      return false;
    }
    setIsSending(true);
    try {
      const message = await sendTicketMedia(ticketId, file, caption, generateUUID());
      setMessages((current) => upsertMessage(current, message));
      setError(null);
      return true;
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && [401, 403].includes(requestError.status)) auth.invalidate();
      setError(requestError instanceof ApiError ? requestError.message : "Media could not be sent");
      await refresh();
      return false;
    } finally {
      setIsSending(false);
    }
  }

  async function reopen(): Promise<void> {
    try {
      setTicket(await updateTicketStatus(ticketId, "open"));
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : "Ticket could not be reopened");
    }
  }

  return { ticket, messages, isLoading, isSending, error, connectionStatus, refresh, send, sendMedia, reopen };
}
