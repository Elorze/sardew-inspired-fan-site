import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

const getEnv = (name) => String(process.env[name] || "").trim();

export const getSupabaseAdminClient = () => {
  if (cachedClient) return cachedClient;

  const url = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
};
