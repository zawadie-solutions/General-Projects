import type { LevelContent } from './types'
import { containsAny, hasFormatCue } from '../lib/heuristics'

export const coreSkillsContent: LevelContent = {
  id: 'core-skills',
  lessonTitle: 'Four habits that turn an okay prompt into a great one',
  lessonParagraphs: [
    'In Foundation, you learned that specific prompts beat vague ones. Core Skills breaks "be specific" down into four concrete habits you can reach for in almost any prompt: being specific about the task, giving an example of what you want, assigning the AI a role, and setting the format or tone of the answer.',
    'Giving an example is one of the fastest ways to close the gap between what you imagine and what the AI produces. Instead of describing a style in the abstract ("make it punchy"), show it a short sample of the tone you\'re after — it can copy the pattern far more reliably than it can guess at a description.',
    'Assigning a role — "act as a nutritionist," "act as a patient teacher" — tells the AI which knowledge and voice to draw on. Setting the format and tone — a numbered list, a two-sentence limit, a casual tone — tells it how to shape the answer once it has the right content. Together, these four habits turn a rough idea into a prompt that\'s hard to misunderstand.',
  ],
  examples: [
    {
      label: 'Assigning a role',
      weak: 'Explain compound interest.',
      strong:
        'Act as a friendly personal finance teacher explaining this to a total beginner. Explain compound interest using one simple real-life example, in under 100 words.',
      note: 'Assigning a role ("finance teacher") and an audience ("total beginner") shapes both the vocabulary and the tone of the answer, not just its content.',
    },
    {
      label: 'Giving an example and a format',
      weak: 'Write a product description.',
      strong:
        "Write a 2-sentence product description for a reusable water bottle, in the same playful style as this example: \"Say goodbye to soggy gym bags — our socks wick sweat before it becomes a problem.\" Return it as plain text, no bullet points.",
      note: 'The sample sentence shows the AI exactly what "playful" means here, and the format instruction (2 sentences, plain text) removes any guesswork about length or layout.',
    },
  ],
  exercises: [
    {
      type: 'multiple-choice',
      id: 'cs-mc-1',
      prompt:
        "Which prompt is more likely to get an answer in the right voice and expertise level?",
      options: [
        { id: 'a', text: 'Explain how vaccines work.' },
        {
          id: 'b',
          text: 'Act as a friendly doctor explaining this to a worried parent. Explain how vaccines work in simple, reassuring terms, in 3 short paragraphs.',
        },
      ],
      correctId: 'b',
      explanation:
        "Option B assigns a role (a doctor), an audience (a worried parent), a tone (reassuring), and a format (3 short paragraphs). Option A leaves all of that up to chance, so the answer could land anywhere from a textbook definition to a technical deep-dive.",
      points: 10,
    },
    {
      type: 'fix-it',
      id: 'cs-fix-1',
      prompt:
        'This prompt has no role, no format, and no sense of who it\'s for. Rewrite it so the AI knows what expertise to draw on and how to shape the answer.',
      weakPrompt: 'Give me marketing ideas.',
      placeholder:
        'e.g. Act as an experienced marketing consultant. Give me 5 ideas for...',
      criteria: [
        {
          label: 'Assigns a role or expertise angle (e.g. "act as a...")',
          points: 5,
          test: containsAny([
            'act as',
            'as a',
            'as an',
            'expert',
            'consultant',
            'marketer',
          ]),
        },
        {
          label: 'Gives a format or quantity (e.g. a numbered list of 5)',
          points: 5,
          test: hasFormatCue,
        },
        {
          label: 'Names the business or audience the ideas are for',
          points: 5,
          test: containsAny(['for my', 'for our', 'audience', 'customers', 'business', 'shop', 'store']),
        },
      ],
      modelAnswer:
        'Act as an experienced marketing consultant. Give me 5 creative marketing ideas for a small local coffee shop trying to attract more weekday customers. Present them as a numbered list.',
      modelAnswerNote:
        'This names a role (marketing consultant), a format (numbered list of 5), and exactly who the ideas are for — so the AI has a clear, specific target to aim at.',
    },
    {
      type: 'write-it',
      id: 'cs-write-1',
      prompt:
        "You want the AI to help you write the opening line of a cover letter. Write a prompt from scratch that assigns a role, gives an example of the tone you want, and sets a format.",
      placeholder: 'e.g. Act as an experienced career coach...',
      criteria: [
        {
          label: 'Assigns a role (e.g. career coach, hiring expert)',
          points: 5,
          test: containsAny(['act as', 'as a', 'as an', 'coach', 'recruiter', 'expert']),
        },
        {
          label: 'References an example or specific tone (e.g. "like this:", "confident")',
          points: 5,
          test: containsAny(['like', 'style', 'tone', 'example', 'similar to', 'confident', 'warm', 'professional']),
        },
        {
          label: 'Sets a format or length',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        "Act as an experienced career coach. Write one confident, professional opening line for a cover letter for a marketing coordinator role, in a similar tone to: \"I still remember the first campaign I ever ran — it taught me everything about connecting with an audience.\" Keep it to one sentence.",
      modelAnswerNote:
        'This names a role, shows an example sentence to set the tone, and limits the format to one sentence — three of the four Core Skills habits in one prompt.',
    },
    {
      type: 'spot-problem',
      id: 'cs-spot-1',
      prompt: 'Explain machine learning.',
      output:
        '"Machine learning is a field of AI where computers learn patterns from data to make predictions or decisions without being explicitly programmed for every rule."',
      options: [
        { id: 'a', text: 'The prompt is too short to work at all.' },
        {
          id: 'b',
          text: "The prompt doesn't say who the explanation is for or what tone/format to use, so the AI defaults to a generic, textbook-style answer.",
        },
        { id: 'c', text: "The AI's answer is factually wrong." },
        { id: 'd', text: 'The prompt uses too many technical words.' },
      ],
      correctId: 'b',
      explanation:
        "The answer isn't wrong — it's just generic. It reads like an encyclopedia entry because the prompt never said who it's for (a curious kid? someone prepping for a job interview?) or what tone and format to use.",
      points: 10,
    },
  ],
  quiz: [
    {
      id: 'cs-q1',
      question: 'What does "assigning a role" to the AI actually do?',
      options: [
        { id: 'a', text: 'It makes the AI respond faster' },
        {
          id: 'b',
          text: "It shapes the AI's tone, vocabulary, and point of view to match that role",
        },
        { id: 'c', text: "It's just decoration — it doesn't change the answer" },
      ],
      correctId: 'b',
      explanation:
        'A role tells the AI which "voice" and expertise to write from, which changes both the content and the tone of the answer.',
    },
    {
      id: 'cs-q2',
      question: 'Why is giving the AI an example often so effective?',
      options: [
        {
          id: 'a',
          text: 'It shows the AI the style or format to match, instead of leaving it to guess',
        },
        { id: 'b', text: "Examples are technically required for the AI to respond" },
        { id: 'c', text: 'It makes the prompt shorter' },
      ],
      correctId: 'a',
      explanation:
        'A short example is often clearer than any description of a style — the AI can copy a pattern more reliably than it can interpret an adjective.',
    },
    {
      id: 'cs-q3',
      question: 'Which of these best sets the "format" of an answer?',
      options: [
        { id: 'a', text: '"Explain briefly"' },
        { id: 'b', text: '"Answer as a numbered list of exactly 3 items, under 20 words each"' },
        { id: 'c', text: '"Please help"' },
      ],
      correctId: 'b',
      explanation:
        'It spells out the exact structure (numbered list), count (3 items), and length limit (20 words) — nothing left to guess.',
    },
  ],
  quizPassCount: 2,
}
