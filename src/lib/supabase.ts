import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: ReturnType<typeof createClient<Database>> | null = null;
let configurationError: string | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  } catch (error) {
    console.error("Supabase configuration is invalid.", error);
    configurationError = "Your Supabase URL or publishable key is invalid. Check the project settings and try again.";
  }
}

export const supabase = client;
export const supabaseConfigurationError = configurationError;
export const isSupabaseReady = Boolean(client);
