import { useState } from 'react'

import DebateChat from './components/DebateChat'
import LandingPage from './components/LandingPage'
import TopicPicker from './components/TopicPicker'
import type { Difficulty } from './lib/debateApi'

type DebateSettings = {
  topic: string
  difficulty: Difficulty
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
          onNewDebate={() => {
            setDebateSettings(null)
            setStage('picker')
          }}
        />
      ) : (
        <TopicPicker
          onSelectTopic={(topic, difficulty) => {
            setDebateSettings({ topic, difficulty })
            setStage('chat')
          }}
        />
      )}
    </main>
  )
}

export default App
