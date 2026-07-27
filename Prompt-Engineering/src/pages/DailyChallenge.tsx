import { useEffect, useMemo } from 'react'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { todaysChallenge } from '../data/dailyChallenges'
import { Card } from '../components/Card'
import { ChoiceExercise } from '../components/ChoiceExercise'
import { FreeTextExercise } from '../components/FreeTextExercise'
import { useProgress } from '../store/progress'
import { todayKey } from '../lib/date'

export function DailyChallenge() {
  const { recordExercise, completedExercises, awardBadge } = useProgress()
  const challenge = useMemo(() => todaysChallenge(), [])
  const exerciseId = `daily-${todayKey()}-${challenge.id}`
  const done = completedExercises[exerciseId] !== undefined
  const scoreToday = completedExercises[exerciseId] ?? 0

  const dailyDaysCompleted = useMemo(() => {
    const dates = Object.keys(completedExercises)
      .filter((id) => id.startsWith('daily-'))
      .map((id) => id.split('-').slice(1, 4).join('-'))
    return new Set(dates).size
  }, [completedExercises])

  useEffect(() => {
    if (dailyDaysCompleted >= 3) awardBadge('daily-devotee')
  }, [dailyDaysCompleted, awardBadge])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <CalendarDays className="h-3.5 w-3.5" /> Daily Challenge
        </span>
        <h1 className="text-3xl font-extrabold text-heading">Today's Puzzle</h1>
        <p className="mt-2 text-text-soft">
          A new short prompt challenge every day. Come back tomorrow for a new one.
        </p>
      </div>

      {done ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <h2 className="text-lg font-bold text-heading">You're done for today!</h2>
          <p className="text-sm text-text-soft">
            You scored {scoreToday} points on today's challenge. Come back tomorrow for a new
            one.
          </p>
        </Card>
      ) : challenge.type === 'multiple-choice' || challenge.type === 'spot-problem' ? (
        <ChoiceExercise
          exercise={challenge}
          index={1}
          eyebrow="Daily Challenge"
          onComplete={(points) => recordExercise(exerciseId, points)}
        />
      ) : (
        <FreeTextExercise
          exercise={challenge}
          index={1}
          eyebrow="Daily Challenge"
          onComplete={(points) => recordExercise(exerciseId, points)}
        />
      )}
    </div>
  )
}
