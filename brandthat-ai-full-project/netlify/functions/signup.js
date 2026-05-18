export async function handler(event) {
  try {
    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and password are required." }),
      };
    }

    const response = await fetch(
      "https://vfnkmabnocbwawbvdxfo.supabase.co/auth/v1/signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk",
          Authorization: "Bearer sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk",
        },
        body: JSON.stringify({
          email,
          password,
          data: {},
          gotrue_meta_security: {},
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.msg || data.error_description || data.error || "Signup failed.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Verification email sent. Please check your inbox.",
        user: data.user,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Server error." }),
    };
  }
}
