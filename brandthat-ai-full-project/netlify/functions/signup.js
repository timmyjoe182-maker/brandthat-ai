const https = require("https");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const email = body.email;
    const password = body.password;

    const data = JSON.stringify({
      email,
      password,
    });

    const options = {
      hostname: "vfnkmabnocbwawbvdxfo.supabase.co",
      path: "/auth/v1/signup",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk",
        Authorization:
          "Bearer sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk",
        "Content-Length": data.length,
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body,
          });
        });
      });

      req.on("error", reject);

      req.write(data);
      req.end();
    });

    return {
      statusCode: response.statusCode,
      body: response.body,
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
