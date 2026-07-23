// PLACE AT: hooks/useConversations.ts
// PURPOSE:  Fetches all conversations for the current user.
//           Subscribes to Realtime so the list updates when new messages arrive.

"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseMsg, CONV_TABLE, type Conversation } from "@/lib/supabase-messaging";
import { useAuth } from "@/context/AuthContext";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const channelRef = useRef<ReturnType<typeof supabaseMsg.channel> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();

    if (channelRef.current) supabaseMsg.removeChannel(channelRef.current);

    // Re-sort conversation list when last_message updates
    const channel = supabaseMsg
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: CONV_TABLE },
        (payload: { new: Conversation }) => {
          const updated = payload.new as Conversation;
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === updated.id);
            const next   = exists
              ? prev.map((c) => c.id === updated.id ? updated : c)
              : [updated, ...prev];
            return next.sort((a, b) =>
              new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
            );
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabaseMsg.removeChannel(channel); };
  }, [user]);

  return { conversations, loading, reload: load };
}