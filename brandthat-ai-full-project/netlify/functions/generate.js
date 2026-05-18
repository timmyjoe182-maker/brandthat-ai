const OpenAI = require("openai");

exports.handler = async function (event) {
  try {
    const { businessType, tone, topic, contentType } = JSON.parse(event.body);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Brandthat AI, a premium content strategist.",
        },
        {
          role: "user",
          content: `
Business type: ${businessType}
Tone: ${tone}
Content type: ${contentType}
Topic: ${topic}

Create premium social media content.
          `,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: response.choices[0].message.content,
      }),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        text: "AI generation failed.",
      }),
    };
  }
};
