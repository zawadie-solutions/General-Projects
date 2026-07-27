export type LevelId =
  | 'foundation'
  | 'core-skills'
  | 'intermediate'
  | 'advanced'
  | 'mastery'

export interface LevelMeta {
  id: LevelId
  order: number
  title: string
  tagline: string
  description: string
  built: boolean
}

export interface Criterion {
  label: string
  points: number
  test: (text: string) => boolean
}

export interface MultipleChoiceExercise {
  type: 'multiple-choice'
  id: string
  prompt: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
  points: number
}

export interface FreeTextExercise {
  type: 'fix-it' | 'write-it'
  id: string
  prompt: string
  weakPrompt?: string
  placeholder: string
  criteria: Criterion[]
  modelAnswer: string
  modelAnswerNote: string
}

export interface SpotProblemExercise {
  type: 'spot-problem'
  id: string
  prompt: string
  output: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
  points: number
}

export type Exercise =
  | MultipleChoiceExercise
  | FreeTextExercise
  | SpotProblemExercise

export interface QuizQuestion {
  id: string
  question: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
}

export interface LevelContent {
  id: LevelId
  lessonTitle: string
  lessonParagraphs: string[]
  examples: { label: string; weak: string; strong: string; note: string }[]
  exercises: Exercise[]
  quiz: QuizQuestion[]
  quizPassCount: number
}
