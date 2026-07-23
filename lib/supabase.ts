import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const createNoopSupabaseClient = () => ({
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
}) as any;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl ?? "", supabaseAnonKey ?? "")
  : createNoopSupabaseClient();

export const BUCKET = "vehicle-images";