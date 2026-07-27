import { useState } from 'react'
import { CheckCircle2, PartyPopper, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../data/types'
import { Card } from './Card'
import { Button } from './Button'

interface Props {
  questions: QuizQuestion[]
  passCount: number
  pointsPerQuestion: number
  alreadyPassed: boolean
  onPass: (points: number) => void
}

export function QuizCard({
  questions,
  passCount,
  pointsPerQuestion,
  alreadyPassed,
  onPass,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const correctCount = questions.filter((q) => answers[q.id] === q.correctId).length
  const passed = correctCount >= passCount
  const allAnswered = questions.every((q) => answers[q.id])

  function handleSubmit() {
    setSubmitted(true)
    if (correctCount >= passCount) onPass(correctCount * pointsPerQuestion)
  }

  function handleRetry() {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <Card className="border-accent-soft bg-gradient-to-br from-accent-soft/40 to-transparent">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-heading">Level Quiz</h3>
        <span className="text-xs font-medium text-text-soft">
          Need {passCount}/{questions.length} correct to unlock the next level
        </span>
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={q.id}>
            <p className="mb-2 font-medium text-heading">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.id
                const showCorrect = submitted && opt.id === q.correctId
                const showWrong = submitted && isSelected && opt.id !== q.correctId
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                      showCorrect
                        ? 'border-success bg-success-soft text-heading'
                        : showWrong
                          ? 'border-danger bg-danger-soft text-heading'
                          : isSelected
                            ? 'border-accent bg-accent-soft text-heading'
                            : 'border-border bg-surface hover:border-accent'
                    } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {showCorrect && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    )}
                    {showWrong && <XCircle className="h-4 w-4 shrink-0 text-danger" />}
                    <span>{opt.text}</span>
                  </button>
                )
              })}
            </div>
            {submitted && (
              <p className="mt-2 rounded-lg bg-bg p-2.5 text-xs text-text-soft">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {submitted && (
        <div
          className={`mt-5 flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
            passed ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn'
          }`}
        >
          {passed ? <PartyPopper className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {passed
            ? `You got ${correctCount}/${questions.length} — level complete!`
            : `You got ${correctCount}/${questions.length}. You need ${passCount} to pass — give it another go.`}
        </div>
      )}

      <div className="mt-4">
        {alreadyPassed ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Quiz already passed
          </span>
        ) : !submitted ? (
          <Button onClick={handleSubmit} disabled={!allAnswered}>
            Submit Quiz
          </Button>
        ) : !passed ? (
          <Button variant="secondary" onClick={handleRetry}>
            Try Again
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
