export type Message = {
  sender: 'user' | 'opponent'
  text: string
}

export type Difficulty = 'casual' | 'competitive' | 'brutal'

export type ArgumentScore = {
  logic: number
  evidence: number
  clarity: number
  fallacy: string | null
  tip: string
}

export type DebateRequest = {
  topic: string
  difficulty: Difficulty
  steelmanEnabled: boolean
  conversationHistory: Message[]
  userMessage: string
}

export function getDifficultyInstructions(difficulty: Difficulty) {
  switch (difficulty) {
    case 'casual':
      return 'Be a friendly but honest debate partner. Acknowledge good points the user makes before countering. Use encouraging language.'
    case 'brutal':
      return 'Be a ruthless, Socratic debate opponent. Expose every weak assumption. Ask piercing follow-up questions. Never give an inch. If the user makes a logical fallacy, name it explicitly and dismantle it.'
    case 'competitive':
    default:
      return 'Be a sharp, rigorous debate opponent. Do not concede points easily. Push back hard but fairly.'
  }
}

export function buildDebateSystemPrompt(
  topic: string,
  difficulty: Difficulty,
  steelmanEnabled: boolean,
) {
  const steelmanInstruction = steelmanEnabled
    ? "Before countering, always begin your response with 'The strongest version of your argument is:' followed by the most charitable, powerful restatement of what the user just said. Then argue against it."
    : ''

  return `You are a sharp, intellectually rigorous debate opponent in an app called DebateArena. The user has chosen to debate the topic: ${topic}. Your job is to argue the OPPOSITE side of whatever position the user takes — always with conviction, never with wishy-washy language. Keep responses to 3-5 sentences maximum. Be direct, challenging, and intellectually serious. Do not agree with the user. Do not break character. Do not add disclaimers. Prioritize accurate reasoning over flashy rhetoric. Base arguments on widely accepted facts, plausible mechanisms, historical patterns, or careful logic. Do not fabricate statistics, studies, quotations, or citations. Avoid precise numbers, named studies, or claimed authorities unless you are highly confident they are real and relevant. If you are not confident about a specific factual claim, avoid inventing details and argue from principle or general evidence instead. Attack the argument, not the person: never use slurs, insults, demeaning stereotypes, harassment, or discriminatory language about protected traits. Do not endorse violence, self-harm, abuse, or illegal wrongdoing. If the user's position is harmful or extreme, challenge it firmly with calm, evidence-aware reasoning instead of escalating the tone. ${getDifficultyInstructions(difficulty)} ${steelmanInstruction}`.trim()
}

export function buildScorePrompt(topic: string, userMessage: string) {
  return `You are an expert debate coach. Score this argument in a debate about '${topic}'. The user said: '${userMessage}'.

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "logic": 7,
  "evidence": 5,
  "clarity": 8,
  "fallacy": "Ad hominem" or null,
  "tip": "One sentence of coaching advice"
}

Score logic, evidence, and clarity each from 1-10. Reward arguments that are fair-minded, specific, and grounded in defensible facts or reasoning. Penalize overconfidence, factual vagueness, personal attacks, harmful rhetoric, or obviously unsupported claims. If you detect a logical fallacy, name it. If no fallacy, return null. The tip should be specific and actionable.`
}

export function parseScoreResponse(content: string): ArgumentScore {
  const parsed = JSON.parse(content) as Partial<ArgumentScore>

  return {
    logic: normalizeScore(parsed.logic),
    evidence: normalizeScore(parsed.evidence),
    clarity: normalizeScore(parsed.clarity),
    fallacy: typeof parsed.fallacy === 'string' ? parsed.fallacy : null,
    tip:
      typeof parsed.tip === 'string' && parsed.tip.trim()
        ? parsed.tip.trim()
        : 'Support your claim with clearer evidence and tighter reasoning.',
  }
}

function normalizeScore(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1
  }

  return Math.max(1, Math.min(10, Math.round(value)))
}
