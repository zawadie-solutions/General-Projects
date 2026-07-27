import type { LevelContent } from './types'
import { containsAny, hasFormatCue, hasMinWords } from '../lib/heuristics'

export const foundationContent: LevelContent = {
  id: 'foundation',
  lessonTitle: 'What is a prompt, and why does wording matter?',
  lessonParagraphs: [
    'A "prompt" is just the message you type to an AI tool like Claude or ChatGPT. That\'s it — no special syntax, no code. But the AI can only work with the words you actually give it. It can\'t read your mind, see what\'s in your head, or guess details you left out.',
    'That\'s why wording matters so much. A vague prompt gives the AI very little to work with, so it fills in the gaps with generic, average answers. A specific prompt — one that says what you want, who it\'s for, and how you want it — gives the AI a clear target, so it can give you something actually useful.',
    'Think of it like asking a new coworker for help versus asking a close friend. Your friend already knows your situation, so a quick request works fine. A new coworker doesn\'t know any of that yet — you have to spell it out. An AI is always more like the new coworker: it starts every conversation with zero background on you, unless you provide it.',
  ],
  examples: [
    {
      label: 'Asking about a topic',
      weak: 'Tell me about dogs.',
      strong:
        "I'm a first-time dog owner. Give me 3 things I should know about caring for a golden retriever puppy in its first month at home.",
      note: 'The strong version tells the AI who is asking, which dog breed, and exactly how many points to give — so the answer is actually usable.',
    },
    {
      label: 'Asking for writing help',
      weak: 'Write an email.',
      strong:
        'Write a short, friendly email to my landlord asking him to fix a leaking faucet, and ask for a repair date within the week.',
      note: 'The strong version says who it\'s for, the tone, the goal, and what to ask for — the AI no longer has to guess.',
    },
  ],
  exercises: [
    {
      type: 'multiple-choice',
      id: 'f-mc-1',
      prompt: "Which prompt is more likely to get a useful, specific answer?",
      options: [
        { id: 'a', text: 'Give me tips for a presentation.' },
        {
          id: 'b',
          text: "I'm giving a 5-minute presentation to my team about our new sales numbers. Give me 3 tips to keep it clear and confident.",
        },
      ],
      correctId: 'b',
      explanation:
        'Option B tells the AI the setting (team presentation), the topic (sales numbers), the length (5 minutes), and exactly how many tips to give. Option A leaves the AI guessing about all of that, so it can only answer in generalities.',
      points: 10,
    },
    {
      type: 'fix-it',
      id: 'f-fix-1',
      prompt:
        'This prompt is too vague to get a genuinely helpful answer. Rewrite it so it\'s specific enough that the AI knows exactly what to give you.',
      weakPrompt: 'Explain exercise.',
      placeholder:
        'e.g. I\'m a busy beginner. Give me a simple 3-step home workout I can do in 15 minutes with no equipment.',
      criteria: [
        {
          label: 'Says who it\'s for or what level (e.g. beginner, for me)',
          points: 5,
          test: containsAny([
            'beginner',
            'for me',
            'i am',
            "i'm",
            'my',
            'new to',
            'busy',
            'no time',
          ]),
        },
        {
          label: 'Gives a format, amount, or time limit',
          points: 5,
          test: hasFormatCue,
        },
        {
          label: 'Is detailed enough (at least 8 words)',
          points: 5,
          test: hasMinWords(8),
        },
      ],
      modelAnswer:
        "I'm a beginner with no gym equipment. Give me a simple 3-step home workout I can do in 15 minutes, with one sentence explaining each step.",
      modelAnswerNote:
        'Notice it names the audience (beginner, no equipment), the format (3 steps), and the time limit (15 minutes) — none of which were in the original.',
    },
    {
      type: 'write-it',
      id: 'f-write-1',
      prompt:
        "You want the AI to help you write a birthday message for your grandmother, who is turning 80. Write a prompt from scratch that would get a warm, personal message — not a generic greeting-card line.",
      placeholder:
        'e.g. Write a short, warm birthday message for my grandmother who is turning 80...',
      criteria: [
        {
          label: 'Mentions the recipient and occasion (grandmother, 80th birthday)',
          points: 5,
          test: containsAny(['grandmother', 'grandma', '80']),
        },
        {
          label: 'Asks for a specific tone (e.g. warm, heartfelt, personal)',
          points: 5,
          test: containsAny([
            'warm',
            'heartfelt',
            'personal',
            'loving',
            'sweet',
            'funny',
            'sincere',
          ]),
        },
        {
          label: 'Gives a length or format (e.g. short, a few sentences, a card)',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        'Write a short, warm birthday message for my grandmother, who is turning 80. Keep it to 2-3 sentences, mention how much her family loves her, and make it feel personal rather than like a generic greeting card.',
      modelAnswerNote:
        'This names the recipient and occasion, sets a warm tone, and gives a clear length — so the AI has everything it needs.',
    },
    {
      type: 'spot-problem',
      id: 'f-spot-1',
      prompt: 'Make my writing better.',
      output:
        '"Sure! Here are some general tips: use clear language, check your grammar, and make sure your writing flows well. Good luck!"',
      options: [
        { id: 'a', text: 'The prompt is too long and confusing.' },
        {
          id: 'b',
          text: "The prompt doesn't say what writing, what's currently wrong with it, or what \"better\" should mean — so the AI can only give generic advice.",
        },
        { id: 'c', text: 'The prompt uses too much technical language.' },
        { id: 'd', text: "The prompt doesn't include a greeting." },
      ],
      correctId: 'b',
      explanation:
        'There\'s no actual writing attached, no explanation of the goal (an email? an essay? a resume?), and no sense of what "better" means (shorter? more formal? more persuasive?). Without that, the AI has nothing specific to react to.',
      points: 10,
    },
  ],
  quiz: [
    {
      id: 'f-q1',
      question: 'What is a prompt?',
      options: [
        { id: 'a', text: 'A special command only programmers can write' },
        { id: 'b', text: 'The message or instructions you give an AI tool' },
        { id: 'c', text: 'A setting inside the AI app' },
      ],
      correctId: 'b',
      explanation:
        'A prompt is simply what you type to the AI — no special syntax required.',
    },
    {
      id: 'f-q2',
      question: 'Why does a vague prompt usually lead to a vague answer?',
      options: [
        {
          id: 'a',
          text: "Because the AI has to fill in missing details with generic guesses",
        },
        { id: 'b', text: 'Because vague prompts confuse the AI\'s software' },
        { id: 'c', text: 'Because the AI is intentionally being unhelpful' },
      ],
      correctId: 'a',
      explanation:
        'The AI only knows what you tell it. Missing details get filled in with the most average, generic answer possible.',
    },
    {
      id: 'f-q3',
      question: 'Which of these makes a prompt more specific?',
      options: [
        { id: 'a', text: 'Making it as short as possible' },
        {
          id: 'b',
          text: 'Adding context like who it\'s for, the topic, and the format you want',
        },
        { id: 'c', text: 'Using more formal-sounding words' },
      ],
      correctId: 'b',
      explanation:
        'Context, audience, and format are exactly what turn a vague request into a specific, answerable one.',
    },
  ],
  quizPassCount: 2,
}
