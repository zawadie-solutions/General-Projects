import type { LevelMeta } from './types'

export const LEVELS: LevelMeta[] = [
  {
    id: 'foundation',
    order: 1,
    title: 'Foundation',
    tagline: 'What prompts are, and why wording matters',
    description:
      'Start here. Learn what a prompt actually is and why small changes in wording lead to very different answers.',
    built: true,
  },
  {
    id: 'core-skills',
    order: 2,
    title: 'Core Skills',
    tagline: 'Be specific, give examples, assign a role, set format',
    description:
      'The four habits that turn an okay prompt into a great one.',
    built: true,
  },
  {
    id: 'intermediate',
    order: 3,
    title: 'Intermediate',
    tagline: 'Step-by-step thinking, context, and what NOT to do',
    description:
      'Guide the AI through harder tasks by breaking them into steps.',
    built: true,
  },
  {
    id: 'advanced',
    order: 4,
    title: 'Advanced',
    tagline: 'Multi-step prompts, fixing bad prompts, combining skills',
    description: 'Put everything together on trickier, real-world prompts.',
    built: true,
  },
  {
    id: 'mastery',
    order: 5,
    title: 'Mastery',
    tagline: 'The final challenge',
    description: 'One last test that draws on everything you’ve learned.',
    built: true,
  },
]
