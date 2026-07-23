// PLACE AT: lib/supabase-messaging.ts
// PURPOSE:  Supabase client used specifically for messaging + Realtime.
//           Reuses your existing NEXT_PUBLIC_SUPABASE_* env vars.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const createNoopQueryBuilder = () => {
  const queryBuilder = {
    select: () => queryBuilder,
    insert: async () => ({ data: null, error: { message: "Supabase is not configured" } }),
    update: () => queryBuilder,
    upsert: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    or: () => queryBuilder,
    order: () => queryBuilder,
    single: async () => ({ data: null, error: { message: "Supabase is not configured" } }),
    maybeSingle: async () => ({ data: null, error: { message: "Supabase is not configured" } }),
  };

  return queryBuilder;
};

const createNoopSupabaseClient = () => ({
  from: () => createNoopQueryBuilder(),
  channel: () => ({
    subscribe: async () => ({ status: "SUBSCRIBED", error: null }),
    unsubscribe: async () => true,
  }),
  removeChannel: () => undefined,
}) as any;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseMsg = isSupabaseConfigured
  ? createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : createNoopSupabaseClient();

// ── Table names ──────────────────────────────────────────────────────────────
export const CONV_TABLE = "conversations";
export const MSG_TABLE  = "messages";

// ── Types matching the Supabase schema ───────────────────────────────────────

export interface Conversation {
  id:            string;
  listing_id:    number | null;
  listing_title: string | null;
  buyer_id:      string;
  seller_id:     string;
  buyer_name:    string;
  seller_name:   string;
  last_message:  string | null;
  last_at:       string;
  created_at:    string;
}

export interface Message {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  sender_name:     string;
  content:         string;
  type:            "text" | "offer";
  offer_amount:    number | null;
  read:            boolean;
  created_at:      string;
}