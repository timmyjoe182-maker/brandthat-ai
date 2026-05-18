export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and password are required." }),
      };
    }

    const supabaseUrl = "https://vfnkmabnocbwawbvdxfo.supabase.co";
    const supabaseKey = "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        data: {},
      }),
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error:
            data.msg ||
            data.error_description ||
            data.error ||
            data.raw ||
            "Signup failed.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Verification email sent. Please check your inbox.",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error.",
      }),
    };
  }
}
