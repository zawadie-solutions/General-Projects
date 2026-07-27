import { Trophy } from 'lucide-react'
import { SAMPLE_LEADERBOARD } from '../data/leaderboard'
import { Card } from '../components/Card'
import { useProgress } from '../store/progress'

export function Leaderboard() {
  const { points, rankName } = useProgress()

  const rows = [...SAMPLE_LEADERBOARD, { name: 'You', points }].sort(
    (a, b) => b.points - a.points,
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Trophy className="h-3.5 w-3.5" /> Leaderboard
        </span>
        <h1 className="text-3xl font-extrabold text-heading">Top Scores</h1>
        <p className="mt-2 text-text-soft">
          Sample data for now — real cross-device rankings are coming soon.
        </p>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {rows.map((row, i) => {
            const isYou = row.name === 'You'
            return (
              <div
                key={`${row.name}-${i}`}
                className={`flex items-center gap-4 py-3 ${
                  isYou ? 'rounded-xl bg-accent-soft px-3' : 'px-1'
                }`}
              >
                <span
                  className={`w-6 text-sm font-bold ${
                    i < 3 ? 'text-accent' : 'text-text-soft'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {row.name.charAt(0)}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    isYou ? 'text-accent-hover' : 'text-heading'
                  }`}
                >
                  {row.name}
                  {isYou && ` (${rankName})`}
                </span>
                <span className="text-sm font-bold text-heading">{row.points} pts</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
