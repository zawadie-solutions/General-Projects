import type { ModuleContent, ModuleMeta } from '../types'
import { foundationsContent } from './foundations'
import { instructionContextContent } from './instructionContext'
import { reasoningStructureContent } from './reasoningStructure'
import { formattingOutputContent } from './formattingOutput'
import { toolsAgentsContent } from './toolsAgents'
import { evaluationResponsibleContent } from './evaluationResponsible'

export type Module = ModuleMeta & ModuleContent

const META: ModuleMeta[] = [
  {
    id: 'foundations',
    order: 1,
    title: 'Prompt Engineering Foundations',
    blurb: 'Get grounded in what prompts are, how models read them, and the RTCRO framework behind every good one.',
  },
  {
    id: 'instruction-context',
    order: 2,
    title: 'Instruction & Context Design',
    blurb: 'Be explicit, choose zero/one/few-shot correctly, engineer context, and assign the right role.',
  },
  {
    id: 'reasoning-structure',
    order: 3,
    title: 'Reasoning & Structure',
    blurb: 'Guide the model through multi-step thinking and build in self-checking.',
  },
  {
    id: 'formatting-output',
    order: 4,
    title: 'Formatting & Output Control',
    blurb: 'Get outputs in the exact shape you need, and turn your best prompts into reusable templates.',
  },
  {
    id: 'tools-agents',
    order: 5,
    title: 'Tools, Agents & Workflows',
    blurb: 'Prompt models that call tools, hold multi-turn conversations, and carry memory responsibly.',
  },
  {
    id: 'evaluation-responsible',
    order: 6,
    title: 'Evaluation & Responsible Use',
    blurb: "Test prompts like you'd test code, catch bias and hallucination, and score AI responses like Zawadie does.",
  },
]

const CONTENT: Record<string, ModuleContent> = {
  foundations: foundationsContent,
  'instruction-context': instructionContextContent,
  'reasoning-structure': reasoningStructureContent,
  'formatting-output': formattingOutputContent,
  'tools-agents': toolsAgentsContent,
  'evaluation-responsible': evaluationResponsibleContent,
}

export const MODULES: Module[] = META.map((meta) => ({ ...meta, ...CONTENT[meta.id] })).sort(
  (a, b) => a.order - b.order,
)

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id)
}

export function totalLessonCount(): number {
  return MODULES.reduce((sum, m) => sum + m.lessons.length, 0)
}
