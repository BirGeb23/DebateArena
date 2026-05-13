export type Message = {
  sender: 'user' | 'opponent'
  text: string
}

export type Difficulty = 'casual' | 'competitive' | 'brutal'
export type DebateStyle = 'opponent' | 'coach' | 'balanced'

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
  style: DebateStyle
  steelmanEnabled: boolean
  conversationHistory: Message[]
  userMessage: string
}

type PerspectiveLens =
  | 'ethical'
  | 'economic'
  | 'social'
  | 'historical'
  | 'practical'
  | 'psychological'

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

export function getStyleInstructions(style: DebateStyle) {
  switch (style) {
    case 'coach':
      return "Act like a demanding but constructive debate coach. Briefly identify what is strongest in the user's point, then explain how to strengthen it or where it is vulnerable. You may challenge the user's position, but your top priority is helping them reason more clearly."
    case 'balanced':
      return 'Briefly acknowledge the strongest point on each side before giving your counterargument. Aim for nuance and tradeoff-aware reasoning rather than pure confrontation.'
    case 'opponent':
    default:
      return 'Act as a true debate opponent. Take the opposing side directly and pressure-test the user’s reasoning without becoming disrespectful.'
  }
}

export function buildDebateSystemPrompt(
  topic: string,
  difficulty: Difficulty,
  style: DebateStyle,
  steelmanEnabled: boolean,
  conversationHistoryLength = 0,
) {
  const steelmanInstruction = steelmanEnabled
    ? "Before countering, always begin your response with 'The strongest version of your argument is:' followed by the most charitable, powerful restatement of what the user just said. Then argue against it."
    : ''
  const lens = getPerspectiveLens(topic, conversationHistoryLength)
  const sensitiveTopicInstruction = isSensitiveTopic(topic)
    ? 'This is a sensitive or identity-adjacent topic. Use extra care, avoid inflammatory framing, and prefer nuanced, principle-based disagreement.'
    : ''

  return `You are a sharp, intellectually rigorous debate guide in an app called DebateArena. The user has chosen to debate the topic: ${topic}. Keep responses to 3-5 sentences maximum. Be direct, challenging, and intellectually serious. Do not break character. Do not add disclaimers. Prioritize accurate reasoning over flashy rhetoric. Base arguments on widely accepted facts, plausible mechanisms, historical patterns, or careful logic. Do not fabricate statistics, studies, quotations, or citations. Avoid precise numbers, named studies, or claimed authorities unless you are highly confident they are real and relevant. If you are not confident about a specific factual claim, avoid inventing details and argue from principle or general evidence instead. Attack the argument, not the person: never use slurs, insults, demeaning stereotypes, harassment, or discriminatory language about protected traits. Do not endorse violence, self-harm, abuse, or illegal wrongdoing. If the user's position is harmful or extreme, challenge it firmly with calm, evidence-aware reasoning instead of escalating the tone. Favor ${lens} reasoning for this reply only if it naturally fits the topic; if it does not, use the most natural adjacent angle instead. Do not explicitly announce the lens unless doing so genuinely improves clarity. ${getDifficultyInstructions(difficulty)} ${getStyleInstructions(style)} ${sensitiveTopicInstruction} ${steelmanInstruction}`.trim()
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

function getPerspectiveLens(
  topic: string,
  conversationHistoryLength: number,
): PerspectiveLens {
  const allLenses: PerspectiveLens[] = [
    'ethical',
    'economic',
    'social',
    'historical',
    'practical',
    'psychological',
  ]
  const allowedLenses = getAllowedLenses(topic)
  const seed = `${topic}:${conversationHistoryLength}`
  let hash = 0

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return allowedLenses[hash % allowedLenses.length] ?? allLenses[0]
}

function getAllowedLenses(topic: string): PerspectiveLens[] {
  const normalizedTopic = topic.toLowerCase()
  const lensSet = new Set<PerspectiveLens>(['practical', 'social'])

  if (matchesAny(normalizedTopic, ['cat', 'dog', 'pizza', 'movie', 'book', 'morning', 'evening'])) {
    lensSet.add('psychological')
    return orderLenses(lensSet)
  }

  if (
    matchesAny(normalizedTopic, [
      'judge',
      'legal',
      'rights',
      'mandatory',
      'voting',
      'genetic',
      'animals',
      'abortion',
      'death penalty',
    ])
  ) {
    lensSet.add('ethical')
  }

  if (
    matchesAny(normalizedTopic, [
      'college',
      'income',
      'work',
      'tuition',
      'debt',
      'currency',
      'crypto',
      'jobs',
      'economy',
      'remote work',
      'replace human drivers',
    ])
  ) {
    lensSet.add('economic')
  }

  if (
    matchesAny(normalizedTopic, [
      'social media',
      'smartphone',
      'violence',
      'mental health',
      'interaction',
      'metaverse',
      'intelligent',
      'cats',
      'dogs',
    ])
  ) {
    lensSet.add('psychological')
  }

  if (
    matchesAny(normalizedTopic, [
      'ai',
      'privacy',
      'social media',
      'remote work',
      'college',
      'crypto',
      'self-driving',
      'metaverse',
      'cancel culture',
    ])
  ) {
    lensSet.add('historical')
  }

  if (normalizedTopic.includes('should')) {
    lensSet.add('ethical')
  }

  if (lensSet.size === 2) {
    lensSet.add('psychological')
  }

  return orderLenses(lensSet)
}

function orderLenses(lensSet: Set<PerspectiveLens>) {
  const preferredOrder: PerspectiveLens[] = [
    'practical',
    'social',
    'psychological',
    'ethical',
    'economic',
    'historical',
  ]

  return preferredOrder.filter((lens) => lensSet.has(lens))
}

function matchesAny(topic: string, keywords: string[]) {
  return keywords.some((keyword) => topic.includes(keyword))
}

function isSensitiveTopic(topic: string) {
  const normalizedTopic = topic.toLowerCase()
  const sensitiveKeywords = [
    'race',
    'racism',
    'religion',
    'gender',
    'sexuality',
    'lgbt',
    'trans',
    'immigration',
    'abortion',
    'violence',
    'police',
    'prison',
    'death penalty',
    'disability',
    'mental health',
    'suicide',
    'war',
    'terrorism',
    'israel',
    'palestine',
  ]

  return sensitiveKeywords.some((keyword) => normalizedTopic.includes(keyword))
}
