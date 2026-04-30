import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  buildDebateSystemPrompt,
  buildSafetyReviewPrompt,
  buildSafetyRewritePrompt,
  buildScorePrompt,
  parseScoreResponse,
  type ArgumentScore,
  type DebateRequest,
  type Difficulty,
  type Message,
} from './debateShared.js'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type SafetyReview = {
  safe: boolean
  factualRisk: 'low' | 'medium' | 'high'
  tone: 'respectful' | 'borderline' | 'unsafe'
  issues: string[]
}

type JsonObject = Record<string, unknown>

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEBATE_MODEL = 'llama-3.3-70b-versatile'
const ANALYSIS_MODEL = 'llama-3.1-8b-instant'
const SAFE_FALLBACK_RESPONSE =
  'I disagree with that position. A stronger counterargument should rest on careful reasoning, fair treatment of other people, and claims that can actually be defended. If the case depends on hostility, sweeping stereotypes, or shaky facts, then it is not a sound argument to begin with.'

export async function handleDebateRequest(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' })
    return
  }

  try {
    const payload = validateDebateRequest(await readJsonBody(req))
    const responseText = await generateSafeDebateResponse(payload)

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    })

    await streamPlainText(responseText, (token) => {
      res.write(token)
    })

    res.end()
  } catch (error) {
    sendText(
      res,
      getErrorStatus(error),
      getFriendlyErrorMessage(
        error,
        'We could not reach the debate engine. Please try again.',
      ),
    )
  }
}

export async function handleScoreRequest(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const topic = requireString(body.topic, 'topic')
    const userMessage = requireString(body.userMessage, 'userMessage')

    const content = await createChatCompletion(
      [
        {
          role: 'user',
          content: buildScorePrompt(topic, userMessage),
        },
      ],
      ANALYSIS_MODEL,
      { response_format: { type: 'json_object' } },
    )

    sendJson(res, 200, { score: parseScoreResponse(content) })
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: getFriendlyErrorMessage(error, 'Scoring is unavailable right now.'),
    })
  }
}

export async function handleSummaryRequest(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const topic = requireString(body.topic, 'topic')
    const conversationHistory = validateMessageList(body.conversationHistory)
    const scores = validateScoreList(body.scores)
    const scoreLines = scores.length
      ? scores
          .map(
            (score, index) =>
              `Message ${index + 1}: logic ${score.logic}, evidence ${score.evidence}, clarity ${score.clarity}, fallacy ${score.fallacy ?? 'none'}, tip ${score.tip}`,
          )
          .join('\n')
      : 'No scoring data available.'

    const assessment = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            'You are an expert debate coach writing a concise performance summary for a user after a debate session. Keep it to one paragraph of 3-4 sentences, focus on patterns, and make it encouraging but honest.',
        },
        {
          role: 'user',
          content: `Topic: ${topic}

Conversation:
${conversationHistory
  .map((message) => `${message.sender === 'user' ? 'User' : 'Opponent'}: ${message.text}`)
  .join('\n')}

Scores:
${scoreLines}

Write a one-paragraph overall assessment of how the user performed in this debate.`,
        },
      ],
      ANALYSIS_MODEL,
    )

    sendJson(res, 200, { assessment })
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: getFriendlyErrorMessage(
        error,
        'The session summary is unavailable right now.',
      ),
    })
  }
}

async function fetchGroqCompletion(
  body: JsonObject & {
    model: string
    messages: ChatMessage[]
  },
) {
  return fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getGroqApiKey()}`,
    },
    body: JSON.stringify(body),
  })
}

async function createChatCompletion(
  messages: ChatMessage[],
  model: string,
  extraBody: JsonObject = {},
) {
  const response = await fetchGroqCompletion({
    model,
    messages,
    ...extraBody,
  })

  if (!response.ok) {
    const details = await safeReadError(response)
    throw createHttpError(
      response.status >= 500 ? 502 : response.status,
      details || `Groq request failed with status ${response.status}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  return payload.choices?.[0]?.message?.content?.trim() ?? ''
}

async function generateSafeDebateResponse(payload: DebateRequest) {
  const messages = buildDebateMessages(payload)
  const firstDraft = await createChatCompletion(messages, DEBATE_MODEL)
  const firstReview = await reviewDebateResponse(
    payload.topic,
    payload.userMessage,
    firstDraft,
  )

  if (isAcceptableDebateResponse(firstReview)) {
    return firstDraft
  }

  const revisedDraft = await createChatCompletion(
    [
      {
        role: 'system',
        content: buildSafetyRewritePrompt(
          payload.topic,
          payload.difficulty,
          payload.steelmanEnabled,
          payload.userMessage,
          firstDraft,
          firstReview.issues,
        ),
      },
      ...payload.conversationHistory.map(
        (message): ChatMessage => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.text,
        }),
      ),
      {
        role: 'user',
        content: payload.userMessage,
      },
    ],
    DEBATE_MODEL,
  )
  const revisedReview = await reviewDebateResponse(
    payload.topic,
    payload.userMessage,
    revisedDraft,
  )

  if (isAcceptableDebateResponse(revisedReview)) {
    return revisedDraft
  }

  return buildFallbackResponse(payload.steelmanEnabled, payload.userMessage)
}

async function reviewDebateResponse(
  topic: string,
  userMessage: string,
  candidateResponse: string,
) {
  const content = await createChatCompletion(
    [
      {
        role: 'user',
        content: buildSafetyReviewPrompt(topic, userMessage, candidateResponse),
      },
    ],
    ANALYSIS_MODEL,
    { response_format: { type: 'json_object' } },
  )

  return parseSafetyReview(content)
}

function buildDebateMessages(payload: DebateRequest): ChatMessage[] {
  return [
    {
      role: 'system',
      content: buildDebateSystemPrompt(
        payload.topic,
        payload.difficulty,
        payload.steelmanEnabled,
      ),
    },
    ...payload.conversationHistory.map(
      (message): ChatMessage => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
      }),
    ),
    {
      role: 'user',
      content: payload.userMessage,
    },
  ]
}

function parseSafetyReview(content: string) {
  const parsed = JSON.parse(content) as {
    safe?: boolean
    factualRisk?: 'low' | 'medium' | 'high'
    tone?: 'respectful' | 'borderline' | 'unsafe'
    issues?: unknown
  }

  const factualRisk: SafetyReview['factualRisk'] =
    parsed.factualRisk === 'medium' || parsed.factualRisk === 'high'
      ? parsed.factualRisk
      : 'low'
  const tone: SafetyReview['tone'] =
    parsed.tone === 'borderline' || parsed.tone === 'unsafe'
      ? parsed.tone
      : 'respectful'

  return {
    safe: parsed.safe === true,
    factualRisk,
    tone,
    issues: Array.isArray(parsed.issues)
      ? parsed.issues.filter((issue): issue is string => typeof issue === 'string')
      : [],
  } satisfies SafetyReview
}

function isAcceptableDebateResponse(review: SafetyReview) {
  return (
    review.safe &&
    review.factualRisk !== 'high' &&
    review.tone !== 'unsafe'
  )
}

function buildFallbackResponse(steelmanEnabled: boolean, userMessage: string) {
  if (!steelmanEnabled) {
    return SAFE_FALLBACK_RESPONSE
  }

  return `The strongest version of your argument is: ${summarizeUserArgument(userMessage)} Now here's why I still disagree: ${SAFE_FALLBACK_RESPONSE}`
}

function summarizeUserArgument(userMessage: string) {
  const trimmed = userMessage.trim()

  if (!trimmed) {
    return 'you are trying to make the most defensible case for your position.'
  }

  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`
}

async function streamPlainText(
  response: string,
  onToken: (token: string) => void,
) {
  const parts = response.match(/\S+\s*/g) ?? [response]

  for (const part of parts) {
    onToken(part)
    await wait(8)
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody) as JsonObject
  } catch {
    throw createHttpError(400, 'Invalid JSON body.')
  }
}

function validateDebateRequest(body: JsonObject): DebateRequest {
  return {
    topic: requireString(body.topic, 'topic'),
    difficulty: validateDifficulty(body.difficulty),
    steelmanEnabled: Boolean(body.steelmanEnabled),
    conversationHistory: validateMessageList(body.conversationHistory),
    userMessage: requireString(body.userMessage, 'userMessage'),
  }
}

function validateDifficulty(value: unknown): Difficulty {
  if (value === 'casual' || value === 'competitive' || value === 'brutal') {
    return value
  }

  throw createHttpError(400, 'Invalid difficulty.')
}

function validateMessageList(value: unknown): Message[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw createHttpError(400, 'Invalid conversation history.')
    }

    return {
      sender:
        item.sender === 'user' || item.sender === 'opponent'
          ? item.sender
          : (() => {
              throw createHttpError(400, 'Invalid message sender.')
            })(),
      text: requireString(item.text, 'text'),
    }
  })
}

function validateScoreList(value: unknown): ArgumentScore[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw createHttpError(400, 'Invalid score payload.')
    }

    return {
      logic: requireNumber(item.logic, 'logic'),
      evidence: requireNumber(item.evidence, 'evidence'),
      clarity: requireNumber(item.clarity, 'clarity'),
      fallacy: typeof item.fallacy === 'string' ? item.fallacy : null,
      tip: requireString(item.tip, 'tip'),
    }
  })
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(400, `Missing ${fieldName}.`)
  }

  return value.trim()
}

function requireNumber(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw createHttpError(400, `Missing ${fieldName}.`)
  }

  return value
}

function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw createHttpError(
      500,
      'Missing GROQ_API_KEY environment variable.',
    )
  }

  return apiKey
}

async function safeReadError(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: JsonObject) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

function sendText(res: ServerResponse, statusCode: number, message: string) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(message)
}

function createHttpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode })
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode
  }

  return 502
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  const statusCode = getErrorStatus(error)

  if (statusCode >= 400 && statusCode < 500) {
    return 'The request was incomplete. Please try again.'
  }

  return fallback
}
