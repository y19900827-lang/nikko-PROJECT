import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export const PRODUCT_IMAGES_BUCKET =
  process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabaseの環境変数が未設定です。");
  }

  if (!supabaseUrl.startsWith("https://") && !supabaseUrl.startsWith("http://")) {
    throw new Error("Supabase URLが正しくありません。VercelのNEXT_PUBLIC_SUPABASE_URLにhttps://から始まるProject URLを入れてください。");
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return cachedClient;
}
