exports.handler = async (event) => {
  try {
    const { businessType, tone, topic, contentType } = JSON.parse(event.body);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a luxury branding and social media copywriter. Write polished, modern, premium marketing content."
          },
          {
            role: "user",
            content: `
Business Type: ${businessType}
Tone: ${tone}
Content Type: ${contentType}
Topic: ${topic}

Generate:
- A polished caption
- 3 reel hooks
- A CTA
`
          }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: data.choices[0].message.content
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
