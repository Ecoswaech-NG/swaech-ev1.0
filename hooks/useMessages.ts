// PLACE AT: hooks/useMessages.ts
// PURPOSE:  Manages real-time message subscription for a conversation.
//           Uses Supabase Realtime — new messages arrive instantly without polling.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabaseMsg, MSG_TABLE, type Message } from "@/lib/supabase-messaging";

export function useMessages(conversationId: string | null) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading,  setLoading]    = useState(false);
  const [sending,  setSending]    = useState(false);
  const channelRef = useRef<ReturnType<typeof supabaseMsg.channel> | null>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();

    // Unsubscribe from any previous channel
    if (channelRef.current) {
      supabaseMsg.removeChannel(channelRef.current);
    }

    const channel = supabaseMsg
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  MSG_TABLE,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Message }) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates (optimistic update may already have it)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabaseMsg.removeChannel(channel);
    };
  }, [conversationId]);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    content: string,
    type: "text" | "offer" = "text",
    offerAmount?: number
  ) => {
    if (!conversationId || !content.trim()) return false;

    // Optimistic UI — add immediately
    const optimistic: Message = {
      id:              `opt-${Date.now()}`,
      conversation_id: conversationId,
      sender_id:       "__me__",
      sender_name:     "",
      content:         content.trim(),
      type,
      offer_amount:    offerAmount ?? null,
      read:            false,
      created_at:      new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conversationId, content, type, offerAmount }),
      });
      if (!res.ok) {
        // Roll back optimistic update on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return false;
      }
      return true;
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  return { messages, loading, sending, sendMessage, reload: loadMessages };
}