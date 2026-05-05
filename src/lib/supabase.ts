import { createClient } from "@supabase/supabase-js";
const url = (import.meta.env.VITE_SUPABASE_URL as string) ?? "https://iwujzilnqbcsujwhtehz.supabase.co";
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "sb_publishable_FUtfrQb-iBu2nFHhLu1blw_vYZ5v_BK";
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
