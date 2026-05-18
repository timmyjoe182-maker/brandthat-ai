export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed." }),
      };
    }

    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and password required." }),
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
        }),
      }
    );

    const text = await response.text();

    return {
      statusCode: response.status,
      body: JSON.stringify({
        ok: response.ok,
        status: response.status,
        message: response.ok
          ? "Verification email sent. Please check your inbox."
          : "Supabase signup failed.",
        raw: text,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Function crashed.",
        details: String(error?.message || error),
      }),
    };
  }
}
