const OpenAI = require("openai");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a premium luxury brand strategist.",
        },
        {
          role: "user",
          content: `
Business Type: ${body.businessType}
Tone: ${body.tone}
Content Type: ${body.contentType}
Idea: ${body.topic}

Create:
1. Hook
2. Caption
3. CTA
          `,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: completion.choices[0].message.content,
      }),
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
