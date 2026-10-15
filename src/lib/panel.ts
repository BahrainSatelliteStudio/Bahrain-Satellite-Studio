import { supabase } from "@/integrations/supabase/client";

export type Server = { id: string; code: string; name: string; enabled: boolean; activation_api_url: string | null; sort_order: number };
export type Host = { id: string; server_id: string; url: string; is_primary: boolean; sort_order: number };
export type Settings = {
  app_name: string; logo_url: string | null; store_url: string; support_whatsapp: string | null;
  support_phone: string | null; support_telegram: string | null; announcement: string | null; config_version: number;
};

export function toLatinDigits(v: string) {
  return v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");
}

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Settings;
}
