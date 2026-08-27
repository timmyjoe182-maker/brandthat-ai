import { readFileSync } from "node:fs";

const migrationUrl = new URL("../supabase/migrations/20260827143000_add_primary_logo_fields.sql", import.meta.url);
const migrationSql = readFileSync(migrationUrl, "utf8");

console.log("-- BrandThat primary-logo production schema check");
console.log("-- Run this first in the production Supabase SQL Editor:");
console.log(`
select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'brand_workspaces'
order by ordinal_position;
`);

console.log("-- If logo_image_url, primary_logo_asset_id, primary_logo_updated_at, or logo_metadata are missing, run:");
console.log(migrationSql);

console.log("-- Then run this PostgREST schema-cache refresh if your project supports it:");
console.log("notify pgrst, 'reload schema';");
