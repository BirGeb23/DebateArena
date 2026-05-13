import { useState } from 'react'

import DebateChat from './components/DebateChat'
import LandingPage from './components/LandingPage'
import TopicPicker from './components/TopicPicker'
import type { DebateStyle, Difficulty } from './lib/debateApi'

type DebateSettings = {
  topic: string
  difficulty: Difficulty
  style: DebateStyle
}

function App() {
  const [stage, setStage] = useState<'landing' | 'picker' | 'chat'>('landing')
  const [debateSettings, setDebateSettings] = useState<DebateSettings | null>(null)

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {stage === 'landing' ? (
        <LandingPage onStart={() => setStage('picker')} />
      ) : debateSettings ? (
        <DebateChat
          topic={debateSettings.topic}
          difficulty={debateSettings.difficulty}
          style={debateSettings.style}
          onNewDebate={() => {
            setDebateSettings(null)
            setStage('picker')
          }}
        />
      ) : (
        <TopicPicker
          onSelectTopic={(topic, difficulty, style) => {
            setDebateSettings({ topic, difficulty, style })
            setStage('chat')
          }}
        />
      )}
    </main>
  )
}

export default App
