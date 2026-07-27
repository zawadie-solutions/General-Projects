export interface BadgeDef {
  id: string
  name: string
  description: string
}

export const BADGES: Record<string, BadgeDef> = {
  'clear-instructions': {
    id: 'clear-instructions',
    name: 'Clear Instructions',
    description: 'Rewrote a vague prompt into a clear, specific one.',
  },
  'great-with-examples': {
    id: 'great-with-examples',
    name: 'Great with Examples',
    description: 'Wrote a prompt packed with useful context and detail.',
  },
  'sharp-eye': {
    id: 'sharp-eye',
    name: 'Sharp Eye',
    description: 'Spotted exactly why a prompt led to a bad answer.',
  },
  'foundation-graduate': {
    id: 'foundation-graduate',
    name: 'Foundation Graduate',
    description: 'Completed every exercise and the quiz in Foundation.',
  },
  'role-player': {
    id: 'role-player',
    name: 'Role Player',
    description: 'Gave the AI a clear role to shape its tone and expertise.',
  },
  'format-pro': {
    id: 'format-pro',
    name: 'Format Pro',
    description: 'Set a clear format, tone, and example for the AI to match.',
  },
  'core-skills-graduate': {
    id: 'core-skills-graduate',
    name: 'Core Skills Graduate',
    description: 'Completed every exercise and the quiz in Core Skills.',
  },
  'daily-devotee': {
    id: 'daily-devotee',
    name: 'Daily Devotee',
    description: 'Completed 3 Daily Challenges.',
  },
  'battle-champion': {
    id: 'battle-champion',
    name: 'Battle Champion',
    description: 'Correctly called the winner in 3 Prompt Battles.',
  },
  'context-setter': {
    id: 'context-setter',
    name: 'Context Setter',
    description: 'Gave the AI context and ruled out what you didn\'t want.',
  },
  'step-thinker': {
    id: 'step-thinker',
    name: 'Step Thinker',
    description: 'Broke a task into clear, ordered steps.',
  },
  'intermediate-graduate': {
    id: 'intermediate-graduate',
    name: 'Intermediate Graduate',
    description: 'Completed every exercise and the quiz in Intermediate.',
  },
  'combo-fixer': {
    id: 'combo-fixer',
    name: 'Combo Fixer',
    description: 'Fixed a weak prompt by combining a role, format, and constraint.',
  },
  'multi-step-master': {
    id: 'multi-step-master',
    name: 'Multi-Step Master',
    description: 'Structured a multi-stage task into one clean, ordered prompt.',
  },
  'advanced-graduate': {
    id: 'advanced-graduate',
    name: 'Advanced Graduate',
    description: 'Completed every exercise and the quiz in Advanced.',
  },
  'quick-fixer': {
    id: 'quick-fixer',
    name: 'Quick Fixer',
    description: 'Rebuilt a bare prompt using nearly every habit from the course.',
  },
  'prompt-architect': {
    id: 'prompt-architect',
    name: 'Prompt Architect',
    description: 'Combined a role, context, format, and constraint in a single prompt.',
  },
  'prompt-master': {
    id: 'prompt-master',
    name: 'Prompt Master',
    description: 'Completed every level of PromtKit.',
  },
}
