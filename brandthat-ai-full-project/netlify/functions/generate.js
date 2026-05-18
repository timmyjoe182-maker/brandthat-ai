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
          content: `
You are a luxury branding and social media strategist.

Your writing style is:
- Modern
- Premium
- Clean
- Professional
- Sophisticated
- Human sounding

IMPORTANT RULES:
- NEVER use hashtags
- NEVER use emojis unless extremely subtle
- NEVER use markdown symbols like ### or **
- NEVER label sections with numbers
- NEVER sound cheesy or generic
- Keep formatting elegant and minimal

Always structure responses like this:

Primary Hook

Main Caption

Alternate Hooks

Call To Action

Make everything polished and premium.
          `,
        },
        {
          role: "user",
          content: `
Business Type: ${businessType}
Tone: ${tone}
Output Type: ${contentType}
Topic: ${topic}

Generate premium brand content.
          `,
        },
      ],
      temperature: 0.9,
      max_tokens: 700,
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
