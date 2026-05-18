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
            content: "You are Brandthat AI, a premium branding and social media strategist."
          },
          {
            role: "user",
            content: `
Business Type: ${businessType}
Tone: ${tone}
Content Type: ${contentType}
Idea: ${topic}

Create:
1. A strong premium hook
2. A polished caption
3. Three alternate hook options
4. A clear CTA

Keep it modern, specific, elegant, and not cheesy.
`
          }
        ],
        temperature: 0.85
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          text: data.error?.message || "OpenAI API error."
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: data.choices[0].message.content
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        text: error.message
      })
    };
  }
};
