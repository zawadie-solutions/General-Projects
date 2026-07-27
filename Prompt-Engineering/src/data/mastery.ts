import type { LevelContent } from './types'
import { containsAny, hasFormatCue } from '../lib/heuristics'

export const masteryContent: LevelContent = {
  id: 'mastery',
  lessonTitle: 'The final challenge',
  lessonParagraphs: [
    "You've learned the core building blocks: specificity, examples, roles, format, step-by-step thinking, context, telling the AI what not to do, structuring multi-step tasks, and fixing weak prompts fast. Mastery doesn't teach a new trick — it's where you put all of it together on real, messy tasks.",
    "Real requests rarely announce which habit they need. From here on, the skill is diagnosing on your own what a prompt is missing, without a checklist to prompt you — and combining several habits naturally, in one pass.",
  ],
  examples: [
    {
      label: 'Combining nearly everything at once',
      weak: 'Help me get ready for a job interview.',
      strong:
        "Act as a hiring manager doing a mock interview for a marketing coordinator role. I have 3 years of experience but I'm nervous about salary negotiation questions specifically — please don't ask me generic \"tell me about yourself\" questions, I've already practiced those. Do this in order: 1) Ask me one tough salary negotiation question. 2) Wait for my answer. 3) Give me specific feedback on what to improve, in 2-3 bullet points.",
      note: 'Role, context, what-not-to-do, and a numbered multi-step process — nearly every habit from this course shows up in one prompt.',
    },
  ],
  exercises: [
    {
      type: 'multiple-choice',
      id: 'm-mc-1',
      prompt: 'Both of these assign a role. Which one combines more of the habits from this course?',
      options: [
        { id: 'a', text: 'Act as a nutritionist. Give me a meal plan.' },
        {
          id: 'b',
          text: "Act as a nutritionist. I'm vegetarian and allergic to nuts — please don't include any nut-based proteins. Give me a 3-day dinner plan, formatted as a simple table with one dish per day.",
        },
      ],
      correctId: 'b',
      explanation:
        'Option B has a role, context (dietary needs), a constraint (no nuts), and a format (a 3-day table) — option A only has the role, leaving everything else to guesswork.',
      points: 10,
    },
    {
      type: 'fix-it',
      id: 'm-fix-1',
      prompt:
        "This prompt is missing almost everything. Rebuild it using as many habits from this course as you can — a role, context, a constraint, and a format.",
      weakPrompt: 'Help me with my resume.',
      placeholder: 'e.g. Act as a professional resume writer...',
      criteria: [
        {
          label: 'Assigns a role or specifies a field/context',
          points: 5,
          test: containsAny(['act as', 'as a', 'as an', 'resume writer', 'recruiter']),
        },
        {
          label: 'Gives a constraint or what NOT to do',
          points: 5,
          test: containsAny(["don't", 'not ', 'avoid', 'without']),
        },
        {
          label: 'Gives a format',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        "Act as a professional resume writer. I'm a graphic designer with 4 years of experience applying for senior roles — please don't suggest generic objective statements, I already know those are outdated. Rewrite my summary section in 3 concise bullet points.",
      modelAnswerNote:
        'Role, context (field and experience level), a constraint (no generic objective statements), and a format (3 bullet points) — four habits in one prompt.',
    },
    {
      type: 'write-it',
      id: 'm-write-1',
      prompt:
        'Pick any real task you might ask an AI to help with. Write ONE prompt that uses at least four habits from this course: a role, context, a specific format, and either an example or a "what not to do" instruction.',
      placeholder: 'e.g. Act as a... I have... please don\'t... format it as...',
      criteria: [
        {
          label: 'Assigns a role',
          points: 5,
          test: containsAny(['act as', 'as a', 'as an']),
        },
        {
          label: 'Gives context or a constraint about your situation',
          points: 5,
          test: containsAny(['because', 'since', 'i have', 'i am', "i'm", 'my ']),
        },
        {
          label: 'Gives a specific format',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        "Act as a professional editor. This is a cover letter for a design internship, and I tend to ramble — please tighten it to 3 short paragraphs and don't change my personal voice or add generic phrases like \"team player.\"",
      modelAnswerNote:
        "Role, context (the rambling issue), a format (3 short paragraphs), and a what-not-to-do — that's the target for every prompt you write from here on.",
    },
    {
      type: 'spot-problem',
      id: 'm-spot-1',
      prompt: 'Improve this.',
      output:
        '"Sure! Could you share the text you\'d like me to improve, along with what kind of improvement you\'re looking for (clearer, shorter, more formal, etc.)?"',
      options: [
        { id: 'a', text: 'The AI response is unhelpful and rude.' },
        {
          id: 'b',
          text: "The prompt is missing almost everything: no role, no context on what \"improve\" means, no format, and no example of the target style — so the AI has nothing to calibrate to.",
        },
        { id: 'c', text: 'The prompt is grammatically incorrect.' },
        { id: 'd', text: 'The prompt needed to be written in all lowercase.' },
      ],
      correctId: 'b',
      explanation:
        "This is about as bare as a prompt gets — no text to work with, no definition of \"improve,\" no role, no format, no example. The AI's only real option is to ask for all of it back.",
      points: 10,
    },
  ],
  quiz: [
    {
      id: 'm-q1',
      question: 'Why do vague prompts get vague answers? (Foundation)',
      options: [
        { id: 'a', text: 'Because the AI fills gaps with generic guesses' },
        { id: 'b', text: 'Because vague prompts contain a technical error' },
        { id: 'c', text: 'Because the AI runs out of things to say' },
      ],
      correctId: 'a',
      explanation: 'With nothing specific to aim at, the AI defaults to the most average, generic answer it can give.',
    },
    {
      id: 'm-q2',
      question: 'What does assigning a role do? (Core Skills)',
      options: [
        { id: 'a', text: "It shapes the AI's tone, vocabulary, and point of view" },
        { id: 'b', text: 'It makes the AI respond faster' },
        { id: 'c', text: "It's just decoration" },
      ],
      correctId: 'a',
      explanation: 'A role tells the AI which "voice" and expertise to write from.',
    },
    {
      id: 'm-q3',
      question: 'Why tell the AI what NOT to do? (Intermediate)',
      options: [
        { id: 'a', text: 'To make the prompt look more thorough' },
        { id: 'b', text: "To rule out things you've already considered or that don't fit" },
        { id: 'c', text: "It's required syntax" },
      ],
      correctId: 'b',
      explanation: 'A clear "don\'t" heads off a default assumption that keeps sneaking into the answer.',
    },
    {
      id: 'm-q4',
      question: "What's the fastest way to fix a weak prompt? (Advanced)",
      options: [
        { id: 'a', text: 'Start over completely' },
        { id: 'b', text: 'Add the specific missing pieces — role, context, format, or constraint' },
        { id: 'c', text: 'Make it as short as possible' },
      ],
      correctId: 'b',
      explanation: 'Most weak prompts only need one or two missing pieces added, not a full rewrite.',
    },
  ],
  quizPassCount: 3,
}
