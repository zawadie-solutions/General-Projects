import { LEVELS } from '../data/levels'
import { LevelCard } from '../components/LevelCard'
import { useProgress } from '../store/progress'
import { levelProgressPct } from '../lib/levelProgress'

export function LevelMap() {
  const { isLevelUnlocked, isLevelComplete, completedExercises, quizPassed } =
    useProgress()

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-heading">Your Learning Path</h1>
        <p className="mt-2 text-text-soft">
          Work through the levels in order. Each one unlocks once you pass the
          quiz for the level before it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.sort((a, b) => a.order - b.order).map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            unlocked={isLevelUnlocked(level.id)}
            completed={isLevelComplete(level.id)}
            progressPct={levelProgressPct(level.id, completedExercises, quizPassed)}
          />
        ))}
      </div>
    </div>
  )
}
