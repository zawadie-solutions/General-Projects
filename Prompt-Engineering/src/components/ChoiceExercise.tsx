import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { MultipleChoiceExercise, SpotProblemExercise } from '../data/types'
import { Card } from './Card'
import { Button } from './Button'

interface Props {
  exercise: MultipleChoiceExercise | SpotProblemExercise
  index: number
  onComplete: (points: number) => void
  eyebrow?: string
}

export function ChoiceExercise({ exercise, index, onComplete, eyebrow }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  const isCorrect = selected === exercise.correctId
  const label = exercise.type === 'spot-problem' ? 'Spot the Problem' : 'Multiple Choice'

  function handleCheck() {
    if (!selected) return
    setChecked(true)
    if (selected === exercise.correctId) onComplete(exercise.points)
  }

  function handleRetry() {
    setSelected(null)
    setChecked(false)
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          {eyebrow ?? `Exercise ${index}`} · {label}
        </span>
        <span className="text-xs font-medium text-text-soft">{exercise.points} pts</span>
      </div>

      <p className="mb-3 font-medium text-heading">{exercise.prompt}</p>

      {exercise.type === 'spot-problem' && (
        <div className="mb-4 space-y-2">
          <div className="rounded-xl border border-border bg-bg p-3 text-sm">
            <span className="mb-1 block text-xs font-semibold text-text-soft">Prompt used:</span>
            <span className="text-heading">"{exercise.prompt}"</span>
          </div>
          <div className="rounded-xl border border-border bg-bg p-3 text-sm">
            <span className="mb-1 block text-xs font-semibold text-text-soft">AI's output:</span>
            <span className="text-heading">{exercise.output}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {exercise.options.map((opt) => {
          const isSelected = selected === opt.id
          const showCorrect = checked && opt.id === exercise.correctId
          const showWrong = checked && isSelected && opt.id !== exercise.correctId
          return (
            <button
              key={opt.id}
              type="button"
              disabled={checked}
              onClick={() => setSelected(opt.id)}
              className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                showCorrect
                  ? 'border-success bg-success-soft text-heading'
                  : showWrong
                    ? 'border-danger bg-danger-soft text-heading'
                    : isSelected
                      ? 'border-accent bg-accent-soft text-heading'
                      : 'border-border bg-surface hover:border-accent'
              } ${checked ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
              {showWrong && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
              <span>{opt.text}</span>
            </button>
          )
        })}
      </div>

      {checked && (
        <div
          className={`mt-4 rounded-xl p-3 text-sm ${
            isCorrect ? 'bg-success-soft text-heading' : 'bg-warn-soft text-heading'
          }`}
        >
          <p className="mb-1 font-semibold">{isCorrect ? 'Nice work!' : 'Not quite.'}</p>
          <p>{exercise.explanation}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!checked ? (
          <Button onClick={handleCheck} disabled={!selected}>
            Check My Answer
          </Button>
        ) : !isCorrect ? (
          <Button variant="secondary" onClick={handleRetry}>
            Try Again
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Completed
          </span>
        )}
      </div>
    </Card>
  )
}
