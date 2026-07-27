import type { Criterion } from '../data/types'

export interface ScoreResult {
  score: number
  max: number
  hits: { label: string; met: boolean; points: number }[]
}

export function scoreText(text: string, criteria: Criterion[]): ScoreResult {
  const hits = criteria.map((c) => ({
    label: c.label,
    met: text.trim().length > 0 && c.test(text),
    points: c.points,
  }))
  const score = hits.reduce((sum, h) => sum + (h.met ? h.points : 0), 0)
  const max = criteria.reduce((sum, c) => sum + c.points, 0)
  return { score, max, hits }
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export const hasMinWords = (min: number) => (text: string) => wordCount(text) >= min

export const containsAny =
  (words: string[]) =>
  (text: string) => {
    const lower = text.toLowerCase()
    return words.some((w) => lower.includes(w.toLowerCase()))
  }

export const hasFormatCue = (text: string) => {
  const lower = text.toLowerCase()
  const cueWords = [
    'list',
    'step',
    'sentence',
    'paragraph',
    'word',
    'bullet',
    'table',
    'short',
    'long',
    'minute',
    'day',
  ]
  return /\d/.test(text) || cueWords.some((w) => lower.includes(w))
}
