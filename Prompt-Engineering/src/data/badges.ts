export interface BadgeDef {
  id: string
  name: string
  description: string
}

export const BADGES: Record<string, BadgeDef> = {
  'foundations-graduate': {
    id: 'foundations-graduate',
    name: 'Foundations Graduate',
    description: 'Completed every lesson in Prompt Engineering Foundations.',
  },
  'rtcro-master': {
    id: 'rtcro-master',
    name: 'RTCRO Master',
    description: 'Rewrote a poor prompt into a professional one using the RTCRO framework.',
  },
  'instruction-context-graduate': {
    id: 'instruction-context-graduate',
    name: 'Context Architect',
    description: 'Completed every lesson in Instruction & Context Design.',
  },
  'reasoning-structure-graduate': {
    id: 'reasoning-structure-graduate',
    name: 'Reasoning Guide',
    description: 'Completed every lesson in Reasoning & Structure.',
  },
  'formatting-output-graduate': {
    id: 'formatting-output-graduate',
    name: 'Format Pro',
    description: 'Completed every lesson in Formatting & Output Control.',
  },
  'tools-agents-graduate': {
    id: 'tools-agents-graduate',
    name: 'Workflow Builder',
    description: 'Completed every lesson in Tools, Agents & Workflows.',
  },
  'evaluation-responsible-graduate': {
    id: 'evaluation-responsible-graduate',
    name: 'Quality Reviewer',
    description: 'Completed every lesson in Evaluation & Responsible Use.',
  },
  'response-scorer': {
    id: 'response-scorer',
    name: 'Response Scorer',
    description: 'Correctly identified the strongest of five AI responses.',
  },
  'prompt-evaluator': {
    id: 'prompt-evaluator',
    name: 'Prompt Evaluator',
    description: 'Scored a prompt in the Prompt Evaluation tool.',
  },
  certified: {
    id: 'certified',
    name: 'Zawadie PromptClass Certified',
    description: 'Passed the final exam with a score of 80% or higher.',
  },
}
