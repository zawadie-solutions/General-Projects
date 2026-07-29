export type ModuleId =
  | 'foundations'
  | 'instruction-context'
  | 'reasoning-structure'
  | 'formatting-output'
  | 'tools-agents'
  | 'evaluation-responsible'

export interface ModuleMeta {
  id: ModuleId
  order: number
  title: string
  blurb: string
}

export interface Criterion {
  label: string
  points: number
  test: (text: string) => boolean
}

export interface RtcroFramework {
  role: string
  task: string
  context: string
  rules: string
  outputFormat: string
}

export interface Challenge {
  prompt: string
  placeholder: string
  criteria: Criterion[]
  sampleOutput: string
  modelAnswer: string
  modelAnswerNote: string
}

export interface Lesson {
  id: string
  title: string
  teach: string[]
  before: string
  after: string
  framework?: RtcroFramework
  challenge: Challenge
}

export interface ResponseOption {
  id: string
  label: string
  text: string
  scores: {
    accuracy: number
    completeness: number
    helpfulness: number
    truthfulness: number
    safety: number
    formatting: number
    hallucinationFree: number
  }
}

export interface ResponseComparisonLesson {
  id: string
  title: string
  teach: string[]
  promptShown: string
  metrics: { key: keyof ResponseOption['scores']; label: string; description: string }[]
  responses: ResponseOption[]
  bestResponseId: string
  explanation: string
}

export interface ModuleContent {
  id: ModuleId
  lessons: Lesson[]
  comparisonLesson?: ResponseComparisonLesson
}

export interface QuizQuestion {
  id: string
  moduleId: ModuleId
  question: string
  options: { id: string; text: string }[]
  correctId: string
  explanation: string
}
