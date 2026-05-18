# Brandthat AI

Full Netlify-ready React project with OpenAI integration.

## Netlify setup

1. Upload this project to GitHub.
2. In Netlify, create a new site from GitHub.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable:
   - `OPENAI_API_KEY`
   - mark it as secret
6. Deploy.

The frontend calls `/.netlify/functions/generate`.
