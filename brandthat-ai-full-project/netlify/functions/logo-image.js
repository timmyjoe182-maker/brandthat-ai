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
Create a modern, professional logo image.

Brand name:
${brandName || "Unnamed Brand"}

Logo request:
${logoPrompt}

Requirements:
- Premium, modern, clean
- Strong logo mark or wordmark
- Minimal and brand-ready
- Works as a website logo and social media profile image
- Centered composition
- Clean background
- Avoid clutter
- Avoid mockup scenes
- Black and white unless the user asks for color
- If text is included, keep it simple and readable
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
