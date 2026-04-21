import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { topicCategories } from '../data/topics'
import type { Difficulty } from '../lib/debateApi'

type TopicPickerProps = {
  onSelectTopic: (topic: string, difficulty: Difficulty) => void
}

const difficultyOptions: Array<{
  value: Difficulty
  label: string
  activeClass: string
}> = [
  {
    value: 'casual',
    label: 'Casual',
    activeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'competitive',
    label: 'Competitive',
    activeClass: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    value: 'brutal',
    label: 'Brutal',
    activeClass: 'border-red-200 bg-red-50 text-red-700',
  },
]

export default function TopicPicker({ onSelectTopic }: TopicPickerProps) {
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('competitive')

  const submitCustomTopic = () => {
    const trimmed = customTopic.trim()

    if (!trimmed) {
      return
    }

    onSelectTopic(trimmed, difficulty)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              DebateArena
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Pick a topic and start arguing.
            </h1>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((option) => {
                const isActive = option.value === difficulty

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficulty(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? option.activeClass
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label
            htmlFor="custom-topic"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Or enter your own topic
          </label>
          <input
            id="custom-topic"
            type="text"
            value={customTopic}
            onChange={(event) => setCustomTopic(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitCustomTopic()
              }
            }}
            placeholder="Type a custom debate topic and press Enter"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {topicCategories.map((section) => (
          <section
            key={section.category}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-950">{section.category}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                5 topics
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {section.topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onSelectTopic(topic, difficulty)}
                  className="min-h-[112px] rounded-3xl border border-slate-200 bg-white p-4 text-left text-sm font-medium leading-6 text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
