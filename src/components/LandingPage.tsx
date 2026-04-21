import { ArrowRight, Sparkles } from 'lucide-react'

type LandingPageProps = {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-4 py-10 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                DebateArena
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                The AI that argues back
              </h1>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Pick a topic, choose your intensity, and spar with an AI opponent
                that remembers the debate, scores your reasoning, and pushes you to
                sharpen every claim.
              </p>

              <button
                type="button"
                onClick={onStart}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800"
              >
                Start debating
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Live Debate
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Streamed back-and-forth responses with adjustable difficulty.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Instant Coaching
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Logic, evidence, clarity, and fallacy feedback on every move.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Session Recap
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  End each debate with a summary of how your reasoning held up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
