import { ArrowUp, BarChart3, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  type Difficulty,
  type DebateStyle,
  getArgumentScore,
  getDebateResponse,
  getSessionAssessment,
  type ArgumentScore,
  type Message,
} from '../lib/debateApi'

type DebateChatProps = {
  topic: string
  difficulty: Difficulty
  style: DebateStyle
  onNewDebate: () => void
}

type ChatMessage = Message & {
  id: string
  score?: ArgumentScore
  isScoreLoading?: boolean
}

function TypingIndicator() {
  return (
    <div className="flex max-w-xs items-center gap-1 rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 sm:max-w-sm">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-400"
          style={{ animationDelay: `${dot * 160}ms` }}
        />
      ))}
    </div>
  )
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="badge-enter rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
      {label}: {value}/10
    </span>
  )
}

function SummaryMetric({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value.toFixed(1)}/10</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${colorClass}`}
          style={{ width: `${Math.max(0, Math.min(100, value * 10))}%` }}
        />
      </div>
    </div>
  )
}

export default function DebateChat({
  topic,
  difficulty,
  style,
  onNewDebate,
}: DebateChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSteelmanEnabled, setIsSteelmanEnabled] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')
  const [assessment, setAssessment] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const messageCounterRef = useRef(0)

  const difficultyBadge = useMemo(() => {
    switch (difficulty) {
      case 'casual':
        return {
          label: 'Casual',
          className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        }
      case 'brutal':
        return {
          label: 'Brutal',
          className: 'bg-red-50 text-red-700 ring-red-200',
        }
      case 'competitive':
      default:
        return {
          label: 'Competitive',
          className: 'bg-sky-50 text-sky-700 ring-sky-200',
        }
    }
  }, [difficulty])

  const styleBadge = useMemo(() => {
    switch (style) {
      case 'coach':
        return {
          label: 'Coach',
          className: 'bg-amber-50 text-amber-800 ring-amber-200',
        }
      case 'balanced':
        return {
          label: 'Balanced',
          className: 'bg-violet-50 text-violet-800 ring-violet-200',
        }
      case 'opponent':
      default:
        return {
          label: 'Opponent',
          className: 'bg-slate-100 text-slate-700 ring-slate-200',
        }
    }
  }, [style])

  const userScores = useMemo(
    () =>
      messages
        .filter((message) => message.sender === 'user' && message.score)
        .map((message) => message.score as ArgumentScore),
    [messages],
  )

  const averages = useMemo(() => {
    if (userScores.length === 0) {
      return {
        logic: 0,
        evidence: 0,
        clarity: 0,
      }
    }

    const totals = userScores.reduce(
      (accumulator, score) => ({
        logic: accumulator.logic + score.logic,
        evidence: accumulator.evidence + score.evidence,
        clarity: accumulator.clarity + score.clarity,
      }),
      { logic: 0, evidence: 0, clarity: 0 },
    )

    return {
      logic: totals.logic / userScores.length,
      evidence: totals.evidence / userScores.length,
      clarity: totals.clarity / userScores.length,
    }
  }, [userScores])

  const mostCommonFallacy = useMemo(() => {
    const counts = new Map<string, number>()

    for (const score of userScores) {
      if (!score.fallacy) {
        continue
      }

      counts.set(score.fallacy, (counts.get(score.fallacy) ?? 0) + 1)
    }

    let winner: string | null = null
    let highestCount = 0

    for (const [fallacy, count] of counts.entries()) {
      if (count > highestCount) {
        winner = fallacy
        highestCount = count
      }
    }

    return winner
  }, [userScores])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    const lineHeight = 24
    textarea.style.height = `${Math.min(textarea.scrollHeight, lineHeight * 4)}px`
  }, [draft])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) {
      return
    }

    thread.scrollTop = thread.scrollHeight
  }, [messages, isLoading, error])

  const resetDebate = () => {
    setMessages([])
    setDraft('')
    setError('')
    setIsLoading(false)
    setIsSummaryOpen(false)
    setAssessment('')
    setAssessmentError('')
  }

  const nextMessageId = () => {
    messageCounterRef.current += 1
    return `message-${messageCounterRef.current}`
  }

  const handleOpenSummary = () => {
    setIsSummaryOpen(true)
    setAssessment('')
    setAssessmentError('')

    const scoredMessages = messages.filter(
      (message): message is ChatMessage & { score: ArgumentScore } =>
        message.sender === 'user' && Boolean(message.score),
    )

    if (scoredMessages.length === 0) {
      setIsAssessmentLoading(false)
      return
    }

    setIsAssessmentLoading(true)

    void getSessionAssessment(
      topic,
      messages.map(({ sender, text }) => ({ sender, text })),
      scoredMessages.map((message) => message.score),
    )
      .then((result) => {
        setAssessment(result)
      })
      .catch(() => {
        setAssessment('')
        setAssessmentError('The session summary is unavailable right now. Try again in a moment.')
      })
      .finally(() => {
        setIsAssessmentLoading(false)
      })
  }

  const handleSubmit = async () => {
    const trimmed = draft.trim()

    if (!trimmed || isLoading) {
      return
    }

    const userMessageId = nextMessageId()
    const opponentMessageId = nextMessageId()
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: trimmed,
      isScoreLoading: true,
    }
    const historyBeforeSubmit: Message[] = messages.map(({ sender, text }) => ({
      sender,
      text,
    }))

    setDraft('')
    setError('')
    setIsLoading(true)
    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: opponentMessageId,
        sender: 'opponent',
        text: '',
      },
    ])

    const debatePromise = getDebateResponse(
      topic,
      difficulty,
      style,
      isSteelmanEnabled,
      historyBeforeSubmit,
      trimmed,
      (token) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === opponentMessageId
              ? { ...message, text: message.text + token }
              : message,
          ),
        )
      },
    )

    const scorePromise = getArgumentScore(topic, trimmed)

    void scorePromise
      .then((score) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === userMessageId
              ? { ...message, score, isScoreLoading: false }
              : message,
          ),
        )
      })
      .catch(() => {
        setMessages((current) =>
          current.map((message) =>
            message.id === userMessageId
              ? { ...message, isScoreLoading: false }
              : message,
          ),
        )
      })

    try {
      const responseText = await debatePromise

      setMessages((current) =>
        current.map((message) =>
          message.id === opponentMessageId ? { ...message, text: responseText } : message,
        ),
      )
    } catch {
      setMessages((current) =>
        current.filter((message) => message.id !== opponentMessageId),
      )
      setError('We could not reach the debate engine. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 py-3 sm:px-6 sm:py-6">
        <div className="flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl">
          <header className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                Current Topic
              </p>
              <h1 className="truncate text-lg font-bold text-slate-950 sm:text-xl">
                {topic}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${difficultyBadge.className}`}
                >
                  {difficultyBadge.label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${styleBadge.className}`}
                >
                  {styleBadge.label}
                </span>
                {isSteelmanEnabled && (
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                    Steelman ON
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSteelmanEnabled((current) => !current)}
                className={`inline-flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  isSteelmanEnabled
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <span>Steelman Mode</span>
                <span
                  className={`relative h-5 w-9 rounded-full transition ${
                    isSteelmanEnabled ? 'bg-violet-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      isSteelmanEnabled ? 'translate-x-4' : 'translate-x-0'
                    } left-0.5`}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={handleOpenSummary}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <BarChart3 className="h-4 w-4" />
                End debate
              </button>
              <button
                type="button"
                onClick={onNewDebate}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                New debate
              </button>
            </div>
          </header>

          <div
            ref={threadRef}
            className="flex-1 space-y-6 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-6"
          >
            {messages.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
                Make the first argument. DebateArena will respond in {styleBadge.label.toLowerCase()} mode and use a different reasoning angle as the conversation develops.
              </div>
            )}

            {messages.map((message, index) => {
              const isUser = message.sender === 'user'
              const isStreamingPlaceholder =
                message.sender === 'opponent' &&
                isLoading &&
                index === messages.length - 1 &&
                message.text.length === 0

              return (
                <div
                  key={message.id}
                  className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[88%] sm:max-w-[75%]">
                    <p
                      className={`mb-1 text-xs font-medium ${
                        isUser ? 'text-right text-teal-700' : 'text-slate-500'
                      }`}
                    >
                      {isUser ? 'You' : 'Opponent'}
                    </p>
                    {isStreamingPlaceholder ? (
                      <TypingIndicator />
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:text-[15px] ${
                          isUser
                            ? 'rounded-tr-md bg-teal-600 text-white'
                            : 'rounded-tl-md bg-slate-200 text-slate-900'
                        }`}
                      >
                        {message.text}
                      </div>
                    )}

                    {isUser && message.score && (
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <ScorePill label="Logic" value={message.score.logic} />
                        <ScorePill label="Evidence" value={message.score.evidence} />
                        <ScorePill label="Clarity" value={message.score.clarity} />
                        {message.score.fallacy && (
                          <span className="badge-enter rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                            Fallacy: {message.score.fallacy}
                          </span>
                        )}
                      </div>
                    )}

                    {isUser && message.score && (
                      <p className="badge-enter mt-2 text-right text-xs italic text-slate-500 sm:text-sm">
                        {message.score.tip}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label htmlFor="argument" className="sr-only">
                Enter your argument
              </label>
              <textarea
                id="argument"
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="State your argument... Press Cmd/Ctrl + Enter to submit"
                className="min-h-[48px] w-full resize-none overflow-y-auto rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isLoading || !draft.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[170px]"
              >
                <ArrowUp className="h-4 w-4" />
                Submit argument
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSummaryOpen && (
        <div className="modal-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                  Session Summary
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  How you performed
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <SummaryMetric
                  label="Logic"
                  value={averages.logic}
                  colorClass="bg-teal-500"
                />
                <SummaryMetric
                  label="Evidence"
                  value={averages.evidence}
                  colorClass="bg-cyan-500"
                />
                <SummaryMetric
                  label="Clarity"
                  value={averages.clarity}
                  colorClass="bg-emerald-500"
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Most common fallacy
                </p>
                <p
                  className={`mt-1 text-sm ${
                    mostCommonFallacy ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {mostCommonFallacy
                    ? mostCommonFallacy
                    : 'No fallacies detected!'}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Overall assessment
                </p>
                {isAssessmentLoading ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Generating your session summary...
                  </p>
                ) : userScores.length === 0 ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Start debating to unlock a personalized performance summary.
                  </p>
                ) : assessmentError ? (
                  <p className="mt-2 text-sm text-red-600">{assessmentError}</p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {assessment}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetDebate}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Debate again
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDebate()
                  onNewDebate()
                }}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Pick new topic
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
