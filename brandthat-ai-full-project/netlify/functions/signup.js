const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and password are required." }),
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co",
      process.env.SUPABASE_ANON_KEY || "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk"
    );

    const origin = event.headers.origin || "https://brandthat.ai";

    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: origin,
      },
    });

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Verification email sent. Please check your inbox.",
        data,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};
