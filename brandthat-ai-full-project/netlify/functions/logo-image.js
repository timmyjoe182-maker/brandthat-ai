const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildLogoPrompt({ logoPrompt, brandName }) {
  return `
Create one finished, usable logo image.

Brand name or keywords:
${brandName || "Use the brand name, initials, or keywords from the request."}

User request:
${logoPrompt}

Design requirements:
- Make the image itself the final logo concept, not an explanation.
- Follow the user's request exactly when they describe an industry, mascot, object, color, letter, style, or mood.
- Use a clean centered composition on a simple background.
- Create a strong logo mark, emblem, mascot, monogram, wordmark, or icon depending on the request.
- Make it suitable for a website header, social profile image, favicon, business card, and brand kit.
- Avoid mockup scenes, stationery, wall signs, paper sheets, hands, devices, photo backgrounds, clutter, tiny decorative details, and messy text.
- If text appears, keep it short and highly legible.
- If the user asks for color, use color. Otherwise choose a clean professional palette.
`;
}

exports.handler = async (event) => {
  try {
    const { logoPrompt, brandName } = JSON.parse(event.body || "{}");

    if (!logoPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Logo prompt is required." }),
      };
    }

    const finalPrompt = buildLogoPrompt({ logoPrompt, brandName });

    const model = process.env.LOGO_IMAGE_MODEL || "dall-e-3";
    const imageOptions = {
      model,
      prompt: finalPrompt,
      size: "1024x1024",
      n: 1,
    };

    if (model === "dall-e-3") {
      imageOptions.quality = "standard";
      imageOptions.response_format = "url";
    }

    const image = await client.images.generate(imageOptions);

    const imageResult = image?.data?.[0];
    const imageUrl = imageResult?.url;
    const base64Image = imageResult?.b64_json;

    if (!imageUrl && !base64Image) {
      throw new Error("OpenAI did not return a logo image. Please try a more specific logo prompt.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        image: imageUrl || `data:image/png;base64,${base64Image}`,
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
