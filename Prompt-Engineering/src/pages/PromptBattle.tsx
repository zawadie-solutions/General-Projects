import { useEffect, useMemo, useState } from 'react'
import { Swords, Trophy } from 'lucide-react'
import { PROMPT_BATTLES } from '../data/promptBattles'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { useProgress } from '../store/progress'

const POINTS_PER_WIN = 10

export function PromptBattle() {
  const { recordExercise, completedExercises, awardBadge } = useProgress()
  const [index, setIndex] = useState(0)
  const [voted, setVoted] = useState<'a' | 'b' | null>(null)
  const battle = PROMPT_BATTLES[index % PROMPT_BATTLES.length]

  const wins = useMemo(
    () =>
      Object.entries(completedExercises).filter(
        ([id, pts]) => id.startsWith('battle-') && pts > 0,
      ).length,
    [completedExercises],
  )
  const played = useMemo(
    () => Object.keys(completedExercises).filter((id) => id.startsWith('battle-')).length,
    [completedExercises],
  )

  useEffect(() => {
    if (wins >= 3) awardBadge('battle-champion')
  }, [wins, awardBadge])

  function vote(choice: 'a' | 'b') {
    setVoted(choice)
    const correct = choice === battle.betterId
    recordExercise(`battle-${battle.id}`, correct ? POINTS_PER_WIN : 0)
  }

  function nextBattle() {
    setVoted(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Swords className="h-3.5 w-3.5" /> Prompt Battle
        </span>
        <h1 className="text-3xl font-extrabold text-heading">Which prompt wins?</h1>
        <p className="mt-2 text-text-soft">
          Two prompts, two outputs. Vote for the one you think works better, then see why.
        </p>
        {played > 0 && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-text-soft">
            <Trophy className="h-3.5 w-3.5 text-accent" /> {wins}/{played} correct calls
          </p>
        )}
      </div>

      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-text-soft">
        {battle.topic}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {(['a', 'b'] as const).map((side) => {
          const prompt = side === 'a' ? battle.promptA : battle.promptB
          const output = side === 'a' ? battle.outputA : battle.outputB
          const isWinner = voted !== null && battle.betterId === side
          const isPicked = voted === side

          return (
            <Card
              key={side}
              className={`flex flex-col ${
                voted ? (isWinner ? 'border-success ring-1 ring-success' : 'opacity-70') : ''
              }`}
            >
              <span className="mb-2 text-xs font-bold uppercase tracking-wide text-text-soft">
                Prompt {side.toUpperCase()}
              </span>
              <p className="mb-3 rounded-lg bg-bg p-3 text-sm text-heading">"{prompt}"</p>
              <span className="mb-1 text-xs font-semibold text-text-soft">AI's output:</span>
              <p className="mb-4 flex-1 text-sm text-text">{output}</p>
              {voted && isWinner && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  <Trophy className="h-3.5 w-3.5" /> Winner
                </span>
              )}
              <Button
                variant={isPicked && !isWinner ? 'secondary' : 'primary'}
                disabled={voted !== null}
                onClick={() => vote(side)}
              >
                Vote for this one
              </Button>
            </Card>
          )
        })}
      </div>

      {voted && (
        <Card className="mt-5 bg-accent-soft/40">
          <p className="mb-1 text-sm font-bold text-heading">
            {voted === battle.betterId ? "Nice instinct — you called it!" : "Not quite — here's why:"}
          </p>
          <p className="text-sm text-text">{battle.explanation}</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={nextBattle}>
              Next Battle
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
