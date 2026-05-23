import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
