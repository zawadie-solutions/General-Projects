import { Link } from 'react-router-dom'
import { CheckCircle2, Lock, Sparkles } from 'lucide-react'
import type { LevelMeta } from '../data/types'
import { ProgressBar } from './ProgressBar'

interface Props {
  level: LevelMeta
  unlocked: boolean
  completed: boolean
  progressPct: number
}

export function LevelCard({ level, unlocked, completed, progressPct }: Props) {
  const linkTo = `/levels/${level.id}`
  const disabled = !unlocked

  const content = (
    <div
      className={`group flex h-full flex-col rounded-2xl border p-5 transition-all ${
        disabled
          ? 'border-border bg-bg opacity-60'
          : 'border-border bg-surface shadow-sm hover:-translate-y-0.5 hover:border-accent hover:shadow-md'
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
          Level {level.order}
        </span>
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : disabled ? (
          <Lock className="h-5 w-5 text-text-soft" />
        ) : (
          <Sparkles className="h-5 w-5 text-accent" />
        )}
      </div>

      <h3 className="mb-1 text-lg font-bold text-heading">{level.title}</h3>
      <p className="mb-4 text-sm text-text-soft">{level.tagline}</p>

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-xs text-text-soft">
          <span>{level.built ? 'Progress' : 'Coming soon'}</span>
          <span>{progressPct}%</span>
        </div>
        <ProgressBar value={progressPct} />
      </div>
    </div>
  )

  if (disabled) {
    return <div aria-disabled className="cursor-not-allowed">{content}</div>
  }

  return (
    <Link to={linkTo} className="block h-full">
      {content}
    </Link>
  )
}
