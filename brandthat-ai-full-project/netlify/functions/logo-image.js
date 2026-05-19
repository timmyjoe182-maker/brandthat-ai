const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    const { logoPrompt, brandName } = JSON.parse(event.body || "{}");

    if (!logoPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Logo prompt is required." }),
      };
    }

    const finalPrompt = `
Create a modern, premium logo concept for Brandthat.ai's logo generator.

Brand name:
${brandName || "Unnamed Brand"}

User request:
${logoPrompt}

Style requirements:
- Modern, professional, clean
- High-end startup / brand identity quality
- Strong logo mark or wordmark
- Must work as a website logo and social media profile image
- Avoid messy details
- Avoid mockup backgrounds
- Centered composition
- Minimal, polished, brand-ready
- If text is included, keep it clean and readable
`;

    const image = await client.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        image: `data:image/png;base64,${image.data[0].b64_json}`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Logo generation failed.",
      }),
    };
  }
};
