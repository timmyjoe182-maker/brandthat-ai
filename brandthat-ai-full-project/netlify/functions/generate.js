const OpenAI = require("openai");

exports.handler = async function (event) {
  try {
    const { businessType, tone, topic, contentType } = JSON.parse(event.body);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a premium branding and social media strategist.",
        },
        {
          role: "user",
          content: `
Business Type: ${businessType}
Tone: ${tone}
Content Type: ${contentType}
Topic: ${topic}

Create premium social media content with:
- Hook
- Caption
- CTA
- Alternate hooks
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
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        text: "OpenAI connection failed.",
      }),
    };
  }
};
