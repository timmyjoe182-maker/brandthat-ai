const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    const supabase = createClient(
      "https://vfnkmabnocbwawbdvxfo.supabase.co",
      "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk"
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
