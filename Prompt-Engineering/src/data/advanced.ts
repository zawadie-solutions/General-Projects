import type { LevelContent } from './types'
import { containsAny, hasFormatCue, hasMinWords } from '../lib/heuristics'

export const advancedContent: LevelContent = {
  id: 'advanced',
  lessonTitle: 'Multi-step prompts, fixing bad prompts, combining skills',
  lessonParagraphs: [
    "By now you know specificity, examples, roles, format, step-by-step thinking, context, and telling the AI what not to do. Advanced is about combining all of these into single prompts for real, messy tasks — and getting fast at spotting and fixing bad prompts on sight.",
    'Some tasks are really several tasks chained together — research, then summarize, then format as an email. You can ask for all of this in one well-organized prompt by numbering the stages, so the AI addresses each one in order instead of blending them together into one shallow answer.',
    "The fastest way to get better at prompting is to get fast at fixing your own first drafts. When a prompt isn't working, look for what's missing — a role, context, a format, an example, a constraint — and add just enough to fix it. You almost never need to rewrite from scratch.",
  ],
  examples: [
    {
      label: 'Structuring a multi-step task',
      weak: 'Help me with my presentation.',
      strong:
        "I'm giving a presentation on quarterly sales next week. Do this in order: 1) Suggest a 5-slide outline. 2) Write 2-3 bullet points for each slide. 3) Suggest one attention-grabbing opening line.",
      note: 'Numbering the stages keeps the AI from collapsing three different tasks into one shallow answer.',
    },
    {
      label: 'Fixing a bad prompt without starting over',
      weak: 'Write about climate change.',
      strong:
        'Act as a science communicator. Write a 150-word explainer on how rising ocean temperatures affect coral reefs, for a general adult audience with no science background.',
      note: "This didn't need a total rewrite — it just added the four missing pieces: role, length, topic angle, and audience.",
    },
  ],
  exercises: [
    {
      type: 'multiple-choice',
      id: 'a-mc-1',
      prompt: 'Which prompt better handles a task that has several distinct stages?',
      options: [
        { id: 'a', text: 'Help me write and publish a blog post about my trip to Italy.' },
        {
          id: 'b',
          text: 'Help me write a blog post about my trip to Italy. Do this in order: 1) Suggest 3 possible titles. 2) Write a 4-paragraph draft based on the title I pick. 3) Suggest a one-sentence social media caption to promote it.',
        },
      ],
      correctId: 'b',
      explanation:
        'Numbering the stages tells the AI to treat this as three connected tasks in sequence, instead of trying to guess which one you actually want right now.',
      points: 10,
    },
    {
      type: 'fix-it',
      id: 'a-fix-1',
      prompt:
        'This prompt is missing several habits at once. Rewrite it by combining a role, a format, and a constraint.',
      weakPrompt: 'Write social media posts for my new app.',
      placeholder: 'e.g. Act as a social media marketer...',
      criteria: [
        {
          label: 'Assigns a role or names the platform/audience',
          points: 5,
          test: containsAny(['act as', 'as a', 'as an', 'platform', 'audience', 'twitter', 'instagram', 'tiktok', 'linkedin']),
        },
        {
          label: 'Gives a format or quantity',
          points: 5,
          test: hasFormatCue,
        },
        {
          label: 'Gives a constraint or what NOT to do',
          points: 5,
          test: containsAny(["don't", 'not ', 'avoid', 'no ', 'without']),
        },
      ],
      modelAnswer:
        "Act as a social media marketer. Write 3 short Twitter posts announcing the launch of my budgeting app for college students. Keep each under 200 characters, and don't use corporate jargon like \"synergy\" or \"leverage.\"",
      modelAnswerNote:
        'This combines a role, a platform and audience, a format (3 posts, character limit), and an explicit constraint — several habits from this course in one prompt.',
    },
    {
      type: 'write-it',
      id: 'a-write-1',
      prompt:
        'You want the AI to handle a multi-step process: researching a topic, then outlining an article, then writing the intro paragraph. Write ONE prompt from scratch that handles all three stages in order.',
      placeholder: 'e.g. Do this in order: 1) ... 2) ... 3) ...',
      criteria: [
        {
          label: 'Names the topic clearly with enough detail',
          points: 5,
          test: hasMinWords(12),
        },
        {
          label: 'Numbers or orders the stages (e.g. "1)", "first... then...")',
          points: 5,
          test: containsAny(['1)', '1.', 'first', 'then', 'step 1', 'in order']),
        },
        {
          label: 'Gives a format for at least one stage',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        "I'm writing an article about the benefits of urban gardening. Do this in order: 1) Give me 3 key points I should research first. 2) Suggest a 4-section outline based on those points. 3) Write a 2-sentence introduction paragraph that hooks the reader.",
      modelAnswerNote:
        'This orders three distinct stages explicitly, keeps the topic consistent throughout, and gives a format for the final stage.',
    },
    {
      type: 'spot-problem',
      id: 'a-spot-1',
      prompt: 'Write me a marketing plan, and also fix the typos in this email, and also give me a recipe for dinner.',
      output:
        '"Sure, here are some general marketing tips: know your audience, use social media, and track your results. Let me know if you\'d like help with anything else!"',
      options: [
        { id: 'a', text: 'The prompt is too long to process.' },
        {
          id: 'b',
          text: "The prompt crams three unrelated tasks into one request with no structure, so the AI can't clearly address any of them.",
        },
        { id: 'c', text: 'The prompt needed to assign the AI a role.' },
        { id: 'd', text: 'The output should have used bullet points.' },
      ],
      correctId: 'b',
      explanation:
        'When a request bundles several unrelated tasks with no structure, the AI tends to latch onto just one and answer it shallowly. Numbering separate asks (or splitting them into separate prompts) works far better.',
      points: 10,
    },
  ],
  quiz: [
    {
      id: 'a-q1',
      question: "What's the benefit of numbering steps in a multi-part prompt?",
      options: [
        { id: 'a', text: 'It makes the prompt look more professional' },
        { id: 'b', text: 'It keeps the AI from blending distinct tasks together' },
        { id: 'c', text: "It's required for the AI to understand the request at all" },
      ],
      correctId: 'b',
      explanation:
        'Numbered stages tell the AI to treat each part as its own task in sequence, rather than merging everything into one shallow response.',
    },
    {
      id: 'a-q2',
      question: 'When fixing a weak prompt, what usually works best?',
      options: [
        { id: 'a', text: 'Starting over completely with a brand-new prompt' },
        {
          id: 'b',
          text: 'Adding the specific missing pieces — role, context, format, or constraint',
        },
        { id: 'c', text: 'Making the prompt as short as possible' },
      ],
      correctId: 'b',
      explanation:
        'Most weak prompts only need one or two missing pieces added — a full rewrite is rarely necessary.',
    },
    {
      id: 'a-q3',
      question: 'Which is a sign a prompt is trying to do too much at once?',
      options: [
        { id: 'a', text: 'It uses more than 20 words' },
        { id: 'b', text: 'It bundles several unrelated tasks together with no structure' },
        { id: 'c', text: 'It assigns the AI a role' },
      ],
      correctId: 'b',
      explanation:
        "Several unrelated asks crammed into one sentence usually means the AI will only really address one of them — numbering or splitting them fixes this.",
    },
  ],
  quizPassCount: 2,
}
