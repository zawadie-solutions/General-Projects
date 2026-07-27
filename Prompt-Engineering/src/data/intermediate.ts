import type { LevelContent } from './types'
import { containsAny, hasFormatCue } from '../lib/heuristics'

export const intermediateContent: LevelContent = {
  id: 'intermediate',
  lessonTitle: 'Step-by-step thinking, context, and what NOT to do',
  lessonParagraphs: [
    'Foundation and Core Skills covered specificity, examples, roles, and format. Intermediate adds three more habits for trickier requests: breaking a task into steps, giving background context, and telling the AI what NOT to do.',
    "For anything with multiple stages or that requires reasoning, ask the AI to work through it step by step instead of asking for the end result in one leap. This cuts down on skipped steps and makes it easy to spot exactly where something went wrong.",
    "Giving background context — what you've already tried, constraints you're working within, decisions you've already made — stops the AI from suggesting things you've already ruled out. Saying what NOT to do is often just as useful as describing what you do want, especially when an AI's default assumption keeps sneaking into its answers.",
  ],
  examples: [
    {
      label: 'Breaking a task into steps',
      weak: 'Help me plan a birthday party.',
      strong:
        "I'm planning my daughter's 8th birthday party for 12 kids, budget $150, in our backyard. Walk me through this step by step: first the theme, then activities, then a shopping list, then a timeline for the day.",
      note: 'Breaking the ask into ordered steps stops the AI from cramming everything into one vague paragraph and makes sure nothing gets skipped.',
    },
    {
      label: 'Context and what NOT to do',
      weak: 'Give me name ideas for my bakery.',
      strong:
        "Give me 5 name ideas for a vegan bakery in Austin. I already have a similar-sounding competitor called \"Sweet Roots,\" so please don't suggest anything with \"root\" or \"green\" in it, and avoid names that are hard to spell out loud.",
      note: "The context (an existing competitor) and the \"don't\" list stop the AI from suggesting names that are already ruled out.",
    },
  ],
  exercises: [
    {
      type: 'multiple-choice',
      id: 'i-mc-1',
      prompt:
        'Which prompt is more likely to produce a correct, well-reasoned answer to a multi-step math word problem?',
      options: [
        { id: 'a', text: 'A train leaves at 60mph and travels for 3 hours, then slows to 40mph for 2 more hours. How far did it travel in total?' },
        {
          id: 'b',
          text: 'Solve this step by step, showing your work at each stage, then give the final answer: A train leaves at 60mph and travels for 3 hours, then slows to 40mph for 2 more hours. How far did it travel in total?',
        },
      ],
      correctId: 'b',
      explanation:
        'Asking for step-by-step reasoning reduces careless errors and makes it easy to spot exactly where something went wrong, especially on problems with several stages.',
      points: 10,
    },
    {
      type: 'fix-it',
      id: 'i-fix-1',
      prompt:
        "This prompt gives no context and doesn't rule anything out. Rewrite it so the AI knows the situation and what to avoid.",
      weakPrompt: 'Suggest gift ideas for my mom.',
      placeholder: "e.g. Suggest 5 gift ideas for my mom's 60th birthday...",
      criteria: [
        {
          label: 'Gives context about the person or occasion',
          points: 5,
          test: containsAny(['mom', 'mother', 'she likes', 'birthday', 'anniversary', 'budget']),
        },
        {
          label: 'Tells the AI what to avoid or rule out',
          points: 5,
          test: containsAny(["don't", 'not ', 'already have', 'avoid', 'no ']),
        },
        {
          label: 'Gives a format or amount',
          points: 5,
          test: hasFormatCue,
        },
      ],
      modelAnswer:
        "Suggest 5 gift ideas for my mom's 60th birthday. She loves gardening and reading, budget under $50. Please don't suggest anything gardening-related since I already got her a new gardening set, and skip generic gift cards.",
      modelAnswerNote:
        'This names the context (interests, occasion, budget), rules out gardening items and gift cards, and asks for exactly 5 — nothing left to guess.',
    },
    {
      type: 'write-it',
      id: 'i-write-1',
      prompt:
        "You want a workout plan, but running aggravates your knee. Write a prompt from scratch that gives context, tells the AI what NOT to suggest, and asks for a step-by-step plan.",
      placeholder: "e.g. Running aggravates my knee, so please don't...",
      criteria: [
        {
          label: 'Gives context about the constraint (e.g. the knee injury)',
          points: 5,
          test: containsAny(['knee', 'injury', 'hurt', 'pain', 'aggravate']),
        },
        {
          label: 'Tells the AI what NOT to do',
          points: 5,
          test: containsAny(["don't", 'not ', 'avoid', 'no running', 'without']),
        },
        {
          label: 'Asks for a step-by-step or clearly formatted plan',
          points: 5,
          test: (text: string) => containsAny(['step by step', 'step-by-step'])(text) || hasFormatCue(text),
        },
      ],
      modelAnswer:
        "I want to get back into shape, but running aggravates my knee, so please don't include any running or jumping exercises. Walk me through a step-by-step 3-day low-impact strength routine I can do at home.",
      modelAnswerNote:
        'This names the constraint, explicitly rules out running and jumping, and asks for a step-by-step format — all three Intermediate habits in one prompt.',
    },
    {
      type: 'spot-problem',
      id: 'i-spot-1',
      prompt: 'Plan me a trip to Japan.',
      output:
        '"Japan is a wonderful destination! Popular stops include Tokyo for city life and shopping, Kyoto for temples and traditional culture, and Osaka for food. You could spend a few days in each city and use the bullet train to get around."',
      options: [
        { id: 'a', text: 'The output is factually wrong about Japan.' },
        {
          id: 'b',
          text: "The prompt gives no context (when, budget, interests, how many days) and doesn't ask for a step-by-step breakdown, so the AI defaults to the most generic \"greatest hits\" itinerary.",
        },
        { id: 'c', text: 'The prompt should have assigned the AI a role.' },
        { id: 'd', text: 'The output is too short.' },
      ],
      correctId: 'b',
      explanation:
        "Without dates, a budget, interests, or trip length, the AI has nothing to personalize — and without asking for a step-by-step plan, it just lists highlights instead of building an actual itinerary.",
      points: 10,
    },
  ],
  quiz: [
    {
      id: 'i-q1',
      question: 'Why is asking the AI to work "step by step" helpful for multi-part tasks?',
      options: [
        { id: 'a', text: 'It makes the AI respond slower on purpose' },
        { id: 'b', text: 'It reduces skipped steps and makes mistakes easier to spot' },
        { id: 'c', text: "It's only useful for math problems" },
      ],
      correctId: 'b',
      explanation:
        'Breaking reasoning into ordered steps helps catch errors early and stops the AI from jumping straight to a possibly-wrong conclusion.',
    },
    {
      id: 'i-q2',
      question: 'Why would you tell the AI what NOT to do?',
      options: [
        { id: 'a', text: 'To make the prompt look more thorough' },
        {
          id: 'b',
          text: "To rule out options you've already considered or that don't fit your situation",
        },
        { id: 'c', text: "It's required syntax for the AI to respond" },
      ],
      correctId: 'b',
      explanation:
        "A clear \"don't\" often heads off a default assumption that keeps showing up in the AI's answers.",
    },
    {
      id: 'i-q3',
      question: 'What kind of "context" is most useful to include in a prompt?',
      options: [
        { id: 'a', text: 'Any random detail about your day' },
        {
          id: 'b',
          text: "Background the AI wouldn't otherwise know — constraints, prior attempts, or specific circumstances",
        },
        { id: 'c', text: "Only today's date" },
      ],
      correctId: 'b',
      explanation:
        'Useful context fills in the gaps the AI has no way of knowing on its own, like what you already tried or what limits you\'re working within.',
    },
  ],
  quizPassCount: 2,
}
