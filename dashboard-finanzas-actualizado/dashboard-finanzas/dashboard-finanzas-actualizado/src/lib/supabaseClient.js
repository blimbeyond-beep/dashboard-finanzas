import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client = null;

export function getSupabase() {
  // Importante: esto NO crea el cliente en build-time.
  // Se crea solamente cuando el código corre en runtime (browser) y se llama a esta función.
  if (_client) return _client;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
}
