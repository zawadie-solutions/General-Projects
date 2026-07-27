import type { LevelId } from '../data/types'
import { foundationContent } from '../data/foundation'
import { coreSkillsContent } from '../data/coreSkills'
import { intermediateContent } from '../data/intermediate'
import { advancedContent } from '../data/advanced'
import { masteryContent } from '../data/mastery'

export const BUILT_CONTENT: Partial<Record<LevelId, { exercises: { id: string }[] }>> = {
  foundation: foundationContent,
  'core-skills': coreSkillsContent,
  intermediate: intermediateContent,
  advanced: advancedContent,
  mastery: masteryContent,
}

export function levelProgressPct(
  levelId: LevelId,
  completedExercises: Record<string, number>,
  quizPassed: Partial<Record<LevelId, boolean>>,
): number {
  const content = BUILT_CONTENT[levelId]
  if (!content) return 0
  const exerciseIds = content.exercises.map((e) => e.id)
  const doneExercises = exerciseIds.filter((id) => completedExercises[id] !== undefined).length
  const quizDone = quizPassed[levelId] ? 1 : 0
  const totalSteps = exerciseIds.length + 1
  return Math.round(((doneExercises + quizDone) / totalSteps) * 100)
}
