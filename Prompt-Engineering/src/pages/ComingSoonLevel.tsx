import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction, Lock } from 'lucide-react'
import { LEVELS } from '../data/levels'
import type { LevelId } from '../data/types'
import { Card } from '../components/Card'
import { useProgress } from '../store/progress'

export function ComingSoonLevel() {
  const { levelId } = useParams<{ levelId: string }>()
  const { isLevelUnlocked } = useProgress()
  const level = LEVELS.find((l) => l.id === levelId)

  if (!level) return <Navigate to="/levels" replace />

  const unlocked = isLevelUnlocked(level.id as LevelId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <Card className="flex flex-col items-center gap-3 py-12">
        {unlocked ? (
          <Construction className="h-8 w-8 text-accent" />
        ) : (
          <Lock className="h-8 w-8 text-text-soft" />
        )}
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
          Level {level.order}
        </span>
        <h1 className="text-2xl font-extrabold text-heading">{level.title}</h1>
        <p className="max-w-sm text-sm text-text-soft">
          {unlocked
            ? `Nice, you've unlocked this level! The full lesson and exercises for ${level.title} are still being built.`
            : `Complete the level before this one to unlock ${level.title}.`}
        </p>
        <p className="max-w-sm text-xs text-text-soft">{level.description}</p>
        <Link
          to="/levels"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" /> Back to levels
        </Link>
      </Card>
    </div>
  )
}
