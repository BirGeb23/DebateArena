DebateArena
DebateArena is an AI-powered debate practice app where users choose a topic, take a position, and argue against a live opponent in real time. Instead of acting like a passive chatbot, the app pushes back, scores each response, highlights possible fallacies, and offers coaching so the experience feels both competitive and educational.

Why I Built It
I built DebateArena to create something more interactive than a standard chat experience. The goal was to help users sharpen critical thinking, practice defending ideas from multiple angles, and engage with an AI system that challenges their reasoning instead of simply agreeing with them.

I also wanted the product to feel thoughtful and responsible, so I added safety-focused prompt design and server-side review logic to keep responses more respectful, evidence-aware, and grounded.

Features
Landing page with a clear entry into the app
Topic picker with preset categories and custom topic support
Difficulty modes: Casual, Competitive, and Brutal
Steelman Mode for charitable restatement before the counterargument
Live AI debate responses powered by Groq
Argument scoring for logic, evidence, and clarity
Logical fallacy detection and coaching tips
End-of-session summary with performance feedback
Mobile-friendly responsive design
Server-side safety checks to reduce offensive, fabricated, or abusive replies
Tech Stack
React 19
TypeScript
Vite
Tailwind CSS
Groq API
Vercel
Lucide React
How It Works
DebateArena uses a React + Vite frontend for the user interface and server-side API routes for the AI layer. The frontend handles topic selection, chat state, scoring UI, and summaries, while the backend routes call Groq for:

debate responses
scoring and fallacy analysis
session summaries
safety review before replies are returned to the user
In local development, Vite serves the /api routes through middleware. In production, Vercel serves those routes from the api/ directory while vercel.json rewrites non-API routes back to index.html.

Running Locally
Install dependencies:
npm install
Create a local environment file:
touch .env
Add your Groq API key:
GROQ_API_KEY=your_key_here
Start the development server:
npm run dev
Build the project:
npm run build
Deploying to Vercel
Push the repo to GitHub.
Import the project into Vercel.
Add the environment variable below in Settings > Environment Variables:
GROQ_API_KEY=your_key_here
Deploy or redeploy the project.
Notes
Never commit your API key.
.env, node_modules, and dist are already ignored.
LLM output can still be imperfect, but the app includes additional guardrails to make debate responses more respectful and reliable.

