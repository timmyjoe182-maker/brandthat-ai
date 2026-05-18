const OpenAI = require("openai");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ text: "Method not allowed." }) };
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ text: "Missing OPENAI_API_KEY in Netlify environment variables." }) };
    }

    const body = JSON.parse(event.body || "{}");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are Brandthat AI, a premium content strategist for modern businesses.

Create ${body.contentType || "marketing content"} for a ${body.businessType || "business"}.

Brand voice: ${body.tone || "Refined"}
Idea: ${body.topic || "A new offer, product, service, or brand moment"}

Requirements:
- Make it polished, modern, specific, and useful.
- Avoid generic filler.
- Include a strong hook.
- Include a caption or main copy.
- Include 3 alternate hook options.
- Include a clear CTA.
- Keep the tone premium but not cheesy.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You create premium social media, ad, and brand content for businesses." },
        { role: "user", content: prompt }
      ],
      temperature: 0.85,
    });

    return { statusCode: 200, body: JSON.stringify({ text: completion.choices?.[0]?.message?.content || "No content generated." }) };
  } catch (error) {
    console.error("AI generation error:", error);
    return { statusCode: 500, body: JSON.stringify({ text: "AI generation failed. Check your OpenAI API key and Netlify function logs." }) };
  }
};
