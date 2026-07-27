import { Link } from 'react-router-dom'
import { Award, Flame, Lock, Star, Trophy } from 'lucide-react'
import { LEVELS } from '../data/levels'
import { BADGES } from '../data/badges'
import { foundationContent } from '../data/foundation'
import { coreSkillsContent } from '../data/coreSkills'
import { intermediateContent } from '../data/intermediate'
import { advancedContent } from '../data/advanced'
import { masteryContent } from '../data/mastery'
import type { Exercise } from '../data/types'
import { Card } from '../components/Card'
import { ProgressBar } from '../components/ProgressBar'
import { BadgeChip } from '../components/BadgeChip'
import { useProgress } from '../store/progress'
import { levelProgressPct } from '../lib/levelProgress'
import { nextRank, rankForPoints } from '../lib/rank'

const EXERCISE_TYPE_LABELS: Record<Exercise['type'], string> = {
  'multiple-choice': 'Multiple Choice',
  'fix-it': 'Fix It',
  'write-it': 'Write It',
  'spot-problem': 'Spot the Problem',
}

function exerciseMax(exercise: Exercise): number {
  return exercise.type === 'multiple-choice' || exercise.type === 'spot-problem'
    ? exercise.points
    : exercise.criteria.reduce((sum, c) => sum + c.points, 0)
}

export function Dashboard() {
  const { points, streak, badges, completedExercises, quizPassed, isLevelUnlocked, isLevelComplete } =
    useProgress()

  const rank = rankForPoints(points)
  const upNextRank = nextRank(points)
  const sortedLevels = [...LEVELS].sort((a, b) => a.order - b.order)
  const currentLevel = sortedLevels.find(
    (l) => isLevelUnlocked(l.id) && !isLevelComplete(l.id),
  )
  const courseComplete = !currentLevel && sortedLevels.every((l) => isLevelComplete(l.id))

  const allExercises = [
    ...foundationContent.exercises,
    ...coreSkillsContent.exercises,
    ...intermediateContent.exercises,
    ...advancedContent.exercises,
    ...masteryContent.exercises,
  ]
  const typeStats = new Map<string, { score: number; max: number }>()
  for (const exercise of allExercises) {
    const earned = completedExercises[exercise.id]
    if (earned === undefined) continue
    const label = EXERCISE_TYPE_LABELS[exercise.type]
    const entry = typeStats.get(label) ?? { score: 0, max: 0 }
    entry.score += earned
    entry.max += exerciseMax(exercise)
    typeStats.set(label, entry)
  }
  const skillRows = Array.from(typeStats.entries())
    .map(([label, { score, max }]) => ({
      label,
      pct: max > 0 ? Math.round((score / max) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)

  const allBadgeIds = Object.keys(BADGES)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-heading">Your Dashboard</h1>
        <p className="mt-2 text-text-soft">
          A snapshot of your progress, badges, and where to focus next.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <Trophy className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="text-lg font-extrabold text-heading">{rank.name}</p>
          <p className="text-xs text-text-soft">
            {upNextRank ? `${upNextRank.min - points} pts to ${upNextRank.name}` : 'Top rank'}
          </p>
        </Card>
        <Card className="text-center">
          <Star className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="text-lg font-extrabold text-heading">{points}</p>
          <p className="text-xs text-text-soft">Points</p>
        </Card>
        <Card className="text-center">
          <Flame className="mx-auto mb-2 h-5 w-5 text-warn" />
          <p className="text-lg font-extrabold text-heading">{streak}</p>
          <p className="text-xs text-text-soft">Day streak</p>
        </Card>
        <Card className="text-center">
          <Award className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="text-lg font-extrabold text-heading">
            {badges.length}/{allBadgeIds.length}
          </p>
          <p className="text-xs text-text-soft">Badges</p>
        </Card>
      </div>

      <Card className="mb-8 flex flex-col items-start justify-between gap-3 bg-gradient-to-br from-accent-soft/50 to-transparent sm:flex-row sm:items-center">
        {courseComplete ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Course complete
              </p>
              <p className="text-lg font-bold text-heading">
                You've finished every level!
              </p>
            </div>
            <Link
              to="/levels/mastery"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Review Mastery
            </Link>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Up next
              </p>
              <p className="text-lg font-bold text-heading">{currentLevel!.title}</p>
            </div>
            <Link
              to={`/levels/${currentLevel!.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Continue
            </Link>
          </>
        )}
      </Card>

      <h2 className="mb-3 text-lg font-bold text-heading">Level Progress</h2>
      <Card className="mb-8">
        <div className="space-y-4">
          {sortedLevels.map((level) => {
            const complete = isLevelComplete(level.id)
            const unlocked = isLevelUnlocked(level.id)
            const pct = levelProgressPct(level.id, completedExercises, quizPassed)
            return (
              <div key={level.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-heading">
                    {!unlocked && <Lock className="h-3.5 w-3.5 text-text-soft" />}
                    {level.title}
                  </span>
                  <span className="text-xs text-text-soft">
                    {complete ? 'Completed' : unlocked ? `${pct}%` : 'Locked'}
                  </span>
                </div>
                <ProgressBar value={unlocked ? pct : 0} />
              </div>
            )
          })}
        </div>
      </Card>

      <h2 className="mb-3 text-lg font-bold text-heading">Badges</h2>
      <Card className="mb-8">
        <div className="flex flex-wrap gap-2">
          {allBadgeIds.map((id) => (
            <BadgeChip key={id} badge={BADGES[id]} locked={!badges.includes(id)} />
          ))}
        </div>
      </Card>

      <h2 className="mb-3 text-lg font-bold text-heading">Strengths & Weak Spots</h2>
      <Card>
        {skillRows.length === 0 ? (
          <p className="text-sm text-text-soft">
            Complete a few exercises and this will fill in with the skills you're
            strongest at.
          </p>
        ) : (
          <div className="space-y-4">
            {skillRows.map((row, i) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-heading">
                    {row.label}
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                        Strongest
                      </span>
                    )}
                    {i === skillRows.length - 1 && skillRows.length > 1 && (
                      <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                        Focus here
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-text-soft">{row.pct}%</span>
                </div>
                <ProgressBar value={row.pct} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
