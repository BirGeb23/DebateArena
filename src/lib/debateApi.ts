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

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

function getApiKey() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY')
  }

  return apiKey
}

function getDifficultyInstructions(difficulty: Difficulty) {
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

function buildDebateSystemPrompt(
  topic: string,
  difficulty: Difficulty,
  steelmanEnabled: boolean,
) {
  const steelmanInstruction = steelmanEnabled
    ? "Before countering, always begin your response with 'The strongest version of your argument is:' followed by the most charitable, powerful restatement of what the user just said. Then argue against it."
    : ''

  return `You are a sharp, intellectually rigorous debate opponent in an app called DebateArena. The user has chosen to debate the topic: ${topic}. Your job is to argue the OPPOSITE side of whatever position the user takes — always with conviction, never with wishy-washy language. Keep responses to 3-5 sentences maximum. Be direct, challenging, and occasionally provocative. Do not agree with the user. Do not break character. Do not add disclaimers. ${getDifficultyInstructions(difficulty)} ${steelmanInstruction}`.trim()
}

async function createChatCompletion(messages: ChatMessage[], model: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`)
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

function parseScoreResponse(content: string) {
  const parsed = JSON.parse(content) as ArgumentScore

  return {
    logic: parsed.logic,
    evidence: parsed.evidence,
    clarity: parsed.clarity,
    fallacy: parsed.fallacy,
    tip: parsed.tip,
  }
}

export async function getDebateResponse(
  topic: string,
  difficulty: Difficulty,
  steelmanEnabled: boolean,
  conversationHistory: Message[],
  userMessage: string,
  onToken: (token: string) => void,
) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: buildDebateSystemPrompt(topic, difficulty, steelmanEnabled),
        },
        ...conversationHistory.map((message) => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.text,
        })),
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`OpenAI request failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6).trim())

      for (const line of lines) {
        if (!line || line === '[DONE]') {
          continue
        }

        const chunk = JSON.parse(line) as ChatCompletionChunk
        const token = chunk.choices?.[0]?.delta?.content ?? ''

        if (!token) {
          continue
        }

        fullResponse += token
        onToken(token)
      }
    }
  }

  return fullResponse
}

export async function getArgumentScore(topic: string, userMessage: string) {
  const content = await createChatCompletion(
    [
      {
        role: 'user',
        content: `You are an expert debate coach. Score this argument in a debate about '${topic}'. The user said: '${userMessage}'. 

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "logic": 7,
  "evidence": 5,
  "clarity": 8,
  "fallacy": "Ad hominem" or null,
  "tip": "One sentence of coaching advice"
}

Score logic, evidence, and clarity each from 1-10. If you detect a logical fallacy, name it. If no fallacy, return null. The tip should be specific and actionable.`,
      },
    ],
    'gpt-4o-mini',
  )

  return parseScoreResponse(content)
}

export async function getSessionAssessment(
  topic: string,
  conversationHistory: Message[],
  scores: ArgumentScore[],
) {
  const scoreLines = scores.length
    ? scores
        .map(
          (score, index) =>
            `Message ${index + 1}: logic ${score.logic}, evidence ${score.evidence}, clarity ${score.clarity}, fallacy ${score.fallacy ?? 'none'}, tip ${score.tip}`,
        )
        .join('\n')
    : 'No scoring data available.'

  return createChatCompletion(
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
    'gpt-4o-mini',
  )
}
