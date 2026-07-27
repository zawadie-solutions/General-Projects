import { useState } from 'react'
import { CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import type { FreeTextExercise as FreeTextExerciseType } from '../data/types'
import { scoreText } from '../lib/heuristics'
import { Card } from './Card'
import { Button } from './Button'

interface Props {
  exercise: FreeTextExerciseType
  index: number
  onComplete: (points: number) => void
  eyebrow?: string
}

export function FreeTextExercise({ exercise, index, onComplete, eyebrow }: Props) {
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(false)
  const [showModel, setShowModel] = useState(false)

  const result = scoreText(text, exercise.criteria)
  const label = exercise.type === 'fix-it' ? 'Fix It' : 'Write It'
  const passed = checked && result.score === result.max

  function handleCheck() {
    if (!text.trim()) return
    setChecked(true)
    onComplete(result.score)
  }

  function handleRetry() {
    setChecked(false)
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          {eyebrow ?? `Exercise ${index}`} · {label}
        </span>
        <span className="text-xs font-medium text-text-soft">{result.max} pts</span>
      </div>

      <p className="mb-3 font-medium text-heading">{exercise.prompt}</p>

      {exercise.weakPrompt && (
        <div className="mb-3 rounded-xl border border-border bg-bg p-3 text-sm">
          <span className="mb-1 block text-xs font-semibold text-text-soft">
            Weak prompt:
          </span>
          <span className="text-heading">"{exercise.weakPrompt}"</span>
        </div>
      )}

      <textarea
        value={text}
        disabled={checked}
        onChange={(e) => setText(e.target.value)}
        placeholder={exercise.placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm text-heading outline-none placeholder:text-text-soft focus:border-accent disabled:bg-bg"
      />

      {checked && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-bg p-3 text-sm">
            <p className="mb-2 font-semibold text-heading">
              You scored {result.score} / {result.max} points
            </p>
            <ul className="space-y-1.5">
              {result.hits.map((hit) => (
                <li key={hit.label} className="flex items-start gap-2">
                  {hit.met ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-text-soft" />
                  )}
                  <span className={hit.met ? 'text-heading' : 'text-text-soft'}>
                    {hit.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {!showModel ? (
            <button
              type="button"
              onClick={() => setShowModel(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
            >
              <Lightbulb className="h-4 w-4" /> See a model answer
            </button>
          ) : (
            <div className="rounded-xl border border-accent-soft bg-accent-soft p-3 text-sm">
              <p className="mb-1 font-semibold text-heading">Model answer</p>
              <p className="mb-2 italic text-heading">"{exercise.modelAnswer}"</p>
              <p className="text-text-soft">{exercise.modelAnswerNote}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {!checked ? (
          <Button onClick={handleCheck} disabled={!text.trim()}>
            Check My Answer
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleRetry}>
            Try Again
          </Button>
        )}
        {passed && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Full marks
          </span>
        )}
      </div>
    </Card>
  )
}
