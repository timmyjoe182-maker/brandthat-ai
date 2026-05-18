import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseAnonKey = "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
