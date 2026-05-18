exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || "{}");

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

    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(
        response.ok
          ? { message: "Verification email sent. Please check your inbox." }
          : { error: data.msg || data.error || "Signup failed." }
      ),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
