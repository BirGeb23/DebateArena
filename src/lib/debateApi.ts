import type {
  ArgumentScore,
  DebateRequest,
  Difficulty,
  Message,
} from './debateShared'

export type { ArgumentScore, Difficulty, Message } from './debateShared'

async function parseJsonResponse<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function getDebateResponse(
  topic: string,
  difficulty: Difficulty,
  steelmanEnabled: boolean,
  conversationHistory: Message[],
  userMessage: string,
  onToken: (token: string) => void,
) {
  const payload: DebateRequest = {
    topic,
    difficulty,
    steelmanEnabled,
    conversationHistory,
    userMessage,
  }

  const response = await fetch('/api/debate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok || !response.body) {
    throw new Error(`Debate request failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const token = decoder.decode(value, { stream: true })

    if (!token) {
      continue
    }

    fullResponse += token
    onToken(token)
  }

  return fullResponse
}

export async function getArgumentScore(topic: string, userMessage: string) {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, userMessage }),
  })

  const payload = await parseJsonResponse<{ score: ArgumentScore }>(response)
  return payload.score
}

export async function getSessionAssessment(
  topic: string,
  conversationHistory: Message[],
  scores: ArgumentScore[],
) {
  const response = await fetch('/api/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, conversationHistory, scores }),
  })

  const payload = await parseJsonResponse<{ assessment: string }>(response)
  return payload.assessment
}
