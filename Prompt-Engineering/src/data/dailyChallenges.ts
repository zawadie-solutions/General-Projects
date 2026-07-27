import type { Exercise } from './types'
import { containsAny, hasFormatCue } from '../lib/heuristics'
import { dayIndexSinceEpoch } from '../lib/date'

export const DAILY_CHALLENGES: Exercise[] = [
  {
    type: 'multiple-choice',
    id: 'd1',
    prompt: 'Which prompt will get a more useful packing list?',
    options: [
      { id: 'a', text: 'What should I pack?' },
      {
        id: 'b',
        text: "I'm going on a 5-day beach trip in July. Give me a packing list of 10 essentials, as a bullet list.",
      },
    ],
    correctId: 'b',
    explanation:
      "Option B gives the trip length, season, and destination type, plus an exact format and count — so the AI can't default to a generic list.",
    points: 15,
  },
  {
    type: 'spot-problem',
    id: 'd2',
    prompt: 'Fix my code.',
    output:
      '"Sure! Please share the code you\'d like me to look at, along with what language it\'s written in and what problem you\'re running into."',
    options: [
      { id: 'a', text: 'The prompt is too polite.' },
      {
        id: 'b',
        text: "The prompt doesn't include the actual code, the language, or what's going wrong — so the AI can't do anything but ask for those details.",
      },
      { id: 'c', text: "The AI's response is rude." },
      { id: 'd', text: 'The prompt should have used all caps.' },
    ],
    correctId: 'b',
    explanation:
      "There's no code attached and no description of the bug, so the AI's only real option is to ask for the missing pieces — exactly what it did.",
    points: 15,
  },
  {
    type: 'fix-it',
    id: 'd3',
    prompt:
      "This prompt gives the AI nothing to work with. Rewrite it so it knows what to study, in what format, and for how long.",
    weakPrompt: 'Help me study.',
    placeholder: 'e.g. Quiz me on my upcoming Spanish vocabulary test...',
    criteria: [
      {
        label: 'Names a subject or topic to study',
        points: 5,
        test: containsAny(['on my', 'about my', 'for my', 'exam', 'quiz', 'test', 'chapter', 'vocabulary', 'subject']),
      },
      {
        label: 'Gives a format (e.g. quiz me, flashcards, practice questions)',
        points: 5,
        test: containsAny(['quiz', 'flashcard', 'practice question', 'summary', 'explain', 'list']),
      },
      {
        label: 'Gives a time limit or amount (e.g. 10 minutes, 5 questions)',
        points: 5,
        test: hasFormatCue,
      },
    ],
    modelAnswer:
      'Quiz me on my upcoming Spanish vocabulary test. Ask me 5 questions, one at a time, and tell me if I got each one right.',
    modelAnswerNote:
      'This names the subject (Spanish vocabulary), the format (quiz, one question at a time), and an amount (5 questions) — the AI knows exactly how to help.',
  },
  {
    type: 'write-it',
    id: 'd4',
    prompt:
      'You want the AI to help you plan a week of vegetarian dinners on a budget. Write a prompt from scratch that gets you a genuinely useful plan.',
    placeholder: 'e.g. Act as a budget meal planner...',
    criteria: [
      {
        label: 'Mentions the dietary constraint (vegetarian)',
        points: 5,
        test: containsAny(['vegetarian', 'veggie', 'plant-based']),
      },
      {
        label: 'Mentions the budget constraint',
        points: 5,
        test: containsAny(['budget', 'cheap', 'affordable', 'inexpensive', 'low-cost', '$']),
      },
      {
        label: 'Gives a format (e.g. a 7-day list, a table)',
        points: 5,
        test: hasFormatCue,
      },
    ],
    modelAnswer:
      'Act as a budget-friendly meal planner. Give me a 7-day vegetarian dinner plan that costs under $40 total for one person, with a simple grocery list at the end.',
    modelAnswerNote:
      'This locks in the diet, the budget, and the exact format — nothing left for the AI to guess.',
  },
  {
    type: 'multiple-choice',
    id: 'd5',
    prompt: 'Which prompt is more likely to get genuinely useful feedback on an essay?',
    options: [
      { id: 'a', text: 'What do you think of my essay?' },
      {
        id: 'b',
        text: 'Read this essay and give me 3 specific ways to make the argument in paragraph 2 more convincing.',
      },
    ],
    correctId: 'b',
    explanation:
      'Option B tells the AI exactly where to focus (paragraph 2) and what kind of feedback to give (argument strength), so the answer will be specific instead of a vague overall impression.',
    points: 15,
  },
  {
    type: 'spot-problem',
    id: 'd6',
    prompt: 'Tell me a joke.',
    output: '"Why don\'t scientists trust atoms? Because they make up everything!"',
    options: [
      { id: 'a', text: "The prompt is broken — it's too vague to work." },
      {
        id: 'b',
        text: "Nothing's really wrong here — for a low-stakes, open-ended request like a joke, a vague prompt is perfectly fine.",
      },
      { id: 'c', text: 'The prompt needed to assign the AI a role.' },
      { id: 'd', text: 'The prompt needed to specify a format.' },
    ],
    correctId: 'b',
    explanation:
      "Specificity matters most when you have a particular outcome in mind. For low-stakes, open-ended requests, a short vague prompt works fine — you don't always need every habit from this course.",
    points: 15,
  },
]

export function todaysChallenge(): Exercise {
  const idx = dayIndexSinceEpoch() % DAILY_CHALLENGES.length
  return DAILY_CHALLENGES[idx]
}
