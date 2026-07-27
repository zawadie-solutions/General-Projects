import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Award, X as XIcon, Check, Lock } from 'lucide-react'
import type { LevelContent, LevelMeta } from '../data/types'
import { BADGES } from '../data/badges'
import { Card } from '../components/Card'
import { ChoiceExercise } from '../components/ChoiceExercise'
import { FreeTextExercise } from '../components/FreeTextExercise'
import { QuizCard } from '../components/QuizCard'
import { BadgeChip } from '../components/BadgeChip'
import { useProgress } from '../store/progress'

interface BadgeIds {
  fixIt: string
  writeIt: string
  spotProblem: string
  graduate: string
}

interface Props {
  level: LevelMeta
  content: LevelContent
  badgeIds: BadgeIds
  nextLevel?: LevelMeta
}

export function LevelDetail({ level, content, badgeIds, nextLevel }: Props) {
  const {
    recordExercise,
    recordQuizPass,
    awardBadge,
    completedExercises,
    quizPassed,
    badges,
    isLevelUnlocked,
  } = useProgress()

  const unlocked = isLevelUnlocked(level.id)
  const exerciseIds = content.exercises.map((e) => e.id)
  const allExercisesDone = exerciseIds.every((id) => completedExercises[id] !== undefined)
  const quizDone = Boolean(quizPassed[level.id])

  useEffect(() => {
    if (allExercisesDone && quizDone) {
      awardBadge(badgeIds.graduate)
    }
  }, [allExercisesDone, quizDone, awardBadge, badgeIds.graduate])

  const levelBadgeIds = Object.values(badgeIds)
  const earnedLevelBadges = badges.filter((b) => levelBadgeIds.includes(b))

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <Card className="flex flex-col items-center gap-3 py-12">
          <Lock className="h-8 w-8 text-text-soft" />
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
            Level {level.order}
          </span>
          <h1 className="text-2xl font-extrabold text-heading">{level.title}</h1>
          <p className="max-w-sm text-sm text-text-soft">
            Complete the level before this one to unlock {level.title}.
          </p>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/levels"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4" /> Back to levels
      </Link>

      <span className="mb-2 inline-block rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
        Level {level.order}
      </span>
      <h1 className="mb-2 text-3xl font-extrabold text-heading">{level.title}</h1>
      <p className="mb-8 text-text-soft">{content.lessonTitle}</p>

      {earnedLevelBadges.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {earnedLevelBadges.map((id) => (
            <BadgeChip key={id} badge={BADGES[id]} />
          ))}
        </div>
      )}

      <Card className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-heading">{content.lessonTitle}</h2>
        <div className="space-y-4 text-sm leading-relaxed text-text">
          {content.lessonParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {content.examples.map((ex) => (
            <div key={ex.label} className="rounded-xl border border-border p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-soft">
                {ex.label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-danger-soft p-3 text-sm">
                  <span className="mb-1 flex items-center gap-1 text-xs font-bold text-danger">
                    <XIcon className="h-3.5 w-3.5" /> Weak
                  </span>
                  <p className="text-heading">"{ex.weak}"</p>
                </div>
                <div className="rounded-lg bg-success-soft p-3 text-sm">
                  <span className="mb-1 flex items-center gap-1 text-xs font-bold text-success">
                    <Check className="h-3.5 w-3.5" /> Strong
                  </span>
                  <p className="text-heading">"{ex.strong}"</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-text-soft">{ex.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="mb-4 text-xl font-bold text-heading">Practice</h2>
      <div className="space-y-5">
        {content.exercises.map((exercise, i) => {
          const index = i + 1
          if (exercise.type === 'multiple-choice' || exercise.type === 'spot-problem') {
            return (
              <ChoiceExercise
                key={exercise.id}
                exercise={exercise}
                index={index}
                onComplete={(points) => {
                  recordExercise(exercise.id, points)
                  if (exercise.type === 'spot-problem') awardBadge(badgeIds.spotProblem)
                }}
              />
            )
          }
          const maxPoints = exercise.criteria.reduce((s, c) => s + c.points, 0)
          return (
            <FreeTextExercise
              key={exercise.id}
              exercise={exercise}
              index={index}
              onComplete={(points) => {
                recordExercise(exercise.id, points)
                if (points === maxPoints) {
                  awardBadge(exercise.type === 'fix-it' ? badgeIds.fixIt : badgeIds.writeIt)
                }
              }}
            />
          )
        })}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold text-heading">
        {nextLevel ? 'Ready to move on?' : 'Final Quiz'}
      </h2>
      <QuizCard
        questions={content.quiz}
        passCount={content.quizPassCount}
        pointsPerQuestion={5}
        alreadyPassed={quizDone}
        onPass={(points) => recordQuizPass(level.id, points)}
      />

      {quizDone && nextLevel && (
        <div className="mt-6 flex justify-end">
          <Link
            to={`/levels/${nextLevel.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Continue to {nextLevel.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {quizDone && !nextLevel && (
        <Card className="mt-6 flex flex-col items-center gap-2 bg-gradient-to-br from-accent-soft/60 to-transparent py-10 text-center">
          <Award className="h-8 w-8 text-accent" />
          <h3 className="text-xl font-extrabold text-heading">You've completed PromptCraft!</h3>
          <p className="max-w-sm text-sm text-text-soft">
            You've worked through all 5 levels and earned the Prompt Master badge. Check your
            Dashboard to see everything you've unlocked.
          </p>
          <Link
            to="/dashboard"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            View Dashboard
          </Link>
        </Card>
      )}
    </div>
  )
}
