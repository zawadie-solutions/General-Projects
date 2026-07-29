import type { ModuleContent } from '../types'
import { containsAny, hasMinWords } from '../../lib/heuristics'

export const reasoningStructureContent: ModuleContent = {
  id: 'reasoning-structure',
  lessons: [
    {
      id: 'chain-of-thought',
      title: 'Chain-of-Thought Prompting',
      teach: [
        'Asking the model to reason step by step before answering improves accuracy on multi-step problems — math, logic, and anything with several dependent parts. Explicitly request the reasoning, then ask for the final answer separately.',
        'This matters most when a task has more than one moving part. For a one-line factual question, chain-of-thought just adds noise — save it for problems where getting an intermediate step wrong would change the final answer.',
      ],
      before: "What's 15% of our Q3 revenue increase?",
      after:
        "Walk through the calculation step by step, then give the final number on its own line labeled 'Answer:'.",
      challenge: {
        prompt: 'Take a multi-step problem and add a step-by-step reasoning instruction to it.',
        placeholder: 'e.g. Walk through this step by step, then give the final answer labeled "Answer:"',
        criteria: [
          { label: 'Explicitly requests step-by-step reasoning', points: 5, test: containsAny(['step by step', 'step-by-step', 'walk through', 'show your work', 'reasoning']) },
          { label: 'Separates the final answer from the reasoning', points: 5, test: containsAny(['answer:', 'final answer', 'on its own line']) },
        ],
        sampleOutput: 'Step 1: identify the Q3 revenue increase. Step 2: multiply by 0.15. Answer: [value]',
        modelAnswer:
          "Show your reasoning step by step, then output only the final number after 'Answer:'.",
        modelAnswerNote:
          'Separating reasoning from the final answer also makes it easy to programmatically grab just the number if you need it downstream.',
      },
    },
    {
      id: 'breaking-down-tasks',
      title: 'Breaking Down Multi-Step Tasks',
      teach: [
        'Long, compound asks confuse models the same way they confuse people. Split the task into ordered sub-steps, or run them as separate prompts and chain the outputs together.',
        'A useful test: if you can\'t say the task in one sentence without "and" three times, it\'s probably several tasks pretending to be one.',
      ],
      before: 'Research competitors, summarize pricing, and write a positioning doc.',
      after:
        "Step 1: List our top 5 competitors. Step 2: Summarize each one's pricing model. Step 3: Using steps 1-2, draft a 1-page positioning doc.",
      challenge: {
        prompt: 'Break one of your own multi-part requests into 3 numbered steps.',
        placeholder: 'e.g. Step 1: ... Step 2: ... Step 3: (using steps 1-2) ...',
        criteria: [
          { label: 'Uses numbered or explicitly ordered steps', points: 5, test: containsAny(['step 1', 'step 2', '1.', '2.', 'first,', 'then,']) },
          { label: 'Later steps build on earlier ones', points: 5, test: containsAny(['using step', 'based on the above', 'from step', 'then use']) },
        ],
        sampleOutput: "Here's the task split into 3 clearly ordered steps, each with its own expected output.",
        modelAnswer:
          'List the sub-tasks in the order they must happen, and tell the model to complete them in that order before producing the final output.',
        modelAnswerNote:
          'Numbering steps also makes it trivial to ask the model to redo just one step later, instead of the whole thing.',
      },
    },
    {
      id: 'self-critique',
      title: 'Self-Critique & Refinement Loops',
      teach: [
        'Asking the model to review its own draft against a checklist before finalizing catches errors a single pass misses. This works especially well for writing and code, where "does this actually meet the brief" is easy to check but easy to skip.',
        'Keep the checklist short and concrete (2-4 items) — a vague "review your work" instruction rarely changes anything, but "check tone, length, and that all 3 facts are included" reliably does.',
      ],
      before: 'Write the announcement.',
      after:
        'Draft the announcement. Then review your draft against this checklist: [tone, length, key facts]. Revise if anything fails, then output only the final version.',
      challenge: {
        prompt: 'Add a self-review checklist step to a writing prompt you use often.',
        placeholder: 'e.g. Draft this, then check it against: [tone, length, facts included]. Revise before giving the final version.',
        criteria: [
          { label: 'Names 2+ concrete checklist items', points: 5, test: hasMinWords(15) },
          { label: 'Instructs a revise-then-finalize step', points: 5, test: containsAny(['revise', 'then output', 'final version', 'if anything fails']) },
        ],
        sampleOutput:
          'Draft reviewed against the checklist — tone and length passed, one missing fact was added in the final version.',
        modelAnswer:
          'After the first draft, instruct the model to check it against 2-3 explicit criteria and revise before giving the final answer.',
        modelAnswerNote:
          'This is the same discipline as a code review checklist, just applied to prose.',
      },
    },
  ],
}
