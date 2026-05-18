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

Create the response in this exact clean format:

STRONG OPENING HOOK
Write one short, premium hook. No hashtags. No markdown symbols.

POLISHED CAPTION
Write a refined caption in 2 short paragraphs. No hashtags. No emojis unless absolutely necessary.

ALTERNATE HOOKS
Write 3 short alternate hooks as clean numbered lines.

CLEAR CALL TO ACTION
Write one professional CTA.

POSTING NOTES
Write 2 short practical notes.

Rules:
- Do not use hashtags.
- Do not use markdown headings like ###.
- Do not use quotation marks around every section.
- Keep it elegant, modern, specific, and business-ready.
- Avoid cheesy luxury words like bespoke, exquisite, indulge, elevate, unless they truly fit.
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
