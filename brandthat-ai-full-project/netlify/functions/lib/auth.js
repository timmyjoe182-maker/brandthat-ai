const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function requireVerifiedUser(event) {
  const token = getBearerToken(event);

  if (!token) {
    return {
      error: {
        statusCode: 401,
        message: "Create your free BrandThat account to start building your brand.",
      },
    };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user || null;

  if (error || !user) {
    return {
      error: {
        statusCode: 401,
        message: "Please log in again to continue.",
      },
    };
  }

  if (!isEmailVerified(user)) {
    return {
      error: {
        statusCode: 403,
        message: "Check your email to verify your account before continuing.",
      },
    };
  }

  return { user };
}

module.exports = {
  requireVerifiedUser,
};
