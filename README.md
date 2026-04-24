# DebateArena

DebateArena is a React + Vite app that turns debate practice into a live sparring session with AI. Users can start from a polished landing page, choose a topic, set the debate difficulty, optionally enable Steelman Mode, and argue against a streamed AI opponent that also scores each argument for logic, evidence, clarity, and fallacies.

## Features

- Landing page with a clean handoff into topic selection
- Topic picker with preset categories and custom topics
- Difficulty modes: Casual, Competitive, Brutal
- Steelman Mode for charitable restatement before the counterargument
- Streamed AI debate responses powered by Groq
- Per-message coaching with logic, evidence, clarity, fallacy, and a tactical tip
- Session summary modal with average scores and final assessment
- Responsive UI tuned for desktop and mobile

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Groq Chat Completions API
- Lucide React

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Add a local environment file in the project root:

```bash
touch .env
```

3. Add your Groq API key to `.env`:

```env
GROQ_API_KEY=your_key_here
```

4. Start the dev server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Vercel Deployment

1. Push this project to GitHub.
2. Go to Vercel, import the GitHub repo, and keep the framework preset as `Vite`.
3. In the Vercel project dashboard, open `Settings` > `Environment Variables`.
4. Add:

```env
GROQ_API_KEY=your_key_here
```

5. Save the variable, trigger a deploy, and wait for the production build to finish.

The app keeps Groq requests on the server. In local development, Vite serves the `/api` routes through middleware. In production, Vercel serves the same endpoints from the `api/` directory while `vercel.json` rewrites non-API routes back to `index.html`.

## Notes

- Never commit your Groq API key.
- `.env`, `node_modules`, and `dist` are already ignored.
- The final URL Vercel gives you is the one to submit to Handshake.
