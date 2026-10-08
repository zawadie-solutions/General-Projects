import type { ModuleContent } from '../types'
import { containsAny, hasConstraintCue, hasFormatCue, hasMinWords, hasRoleCue } from '../../lib/heuristics'

export const foundationsContent: ModuleContent = {
  id: 'foundations',
  lessons: [
    {
      id: 'what-is-a-prompt',
      title: 'What Is a Prompt, Really?',
      teach: [
        'A prompt is the entire input the model sees — instructions, context, examples, and formatting cues all count, not just your final question. Treat it as a spec you\'re handing to a very literal collaborator who has no memory of you and no access to anything you haven\'t typed.',
        'Because the model only knows what\'s in the prompt, every gap you leave gets filled in with a generic, average guess. The fix is not "write more" — it\'s write the specific things that change the answer: who it\'s for, what "good" looks like, and how the response should be shaped.',
      ],
      before: 'Write something about our onboarding process.',
      after:
        'Write a 150-word welcome message for new Zawadie hires that covers day-one logistics, who to contact for IT issues, and where to find the employee handbook. Friendly, plain-spoken tone.',
      challenge: {
        prompt: "Rewrite this vague ask into a specific prompt: 'Help me with the quarterly report.'",
        placeholder: 'e.g. Draft a 3-paragraph summary of Q2 covering revenue vs. target...',
        criteria: [
          {
            label: 'Names a concrete topic or deliverable (revenue, risks, a report section)',
            points: 5,
            test: containsAny(['revenue', 'report', 'summary', 'quarter', 'risk', 'headcount', 'target']),
          },
          { label: 'Gives a format, length, or structure', points: 5, test: hasFormatCue },
          { label: 'Is detailed enough (at least 10 words)', points: 5, test: hasMinWords(10) },
        ],
        sampleOutput:
          "Sure — here's a draft summary of Q2 performance covering revenue vs. target, headcount changes, and open risks, formatted as three short paragraphs.",
        modelAnswer:
          'Draft a 3-paragraph Q2 report covering revenue vs. target, headcount changes, and the top 2 open risks, written for a non-technical exec audience.',
        modelAnswerNote:
          'This names the exact sections to cover, the length (3 paragraphs), and the audience — none of which were in the original.',
      },
    },
    {
      id: 'rtcro-framework',
      title: 'Anatomy of a Great Prompt: the RTCRO Framework',
      teach: [
        'Strong prompts separate five things clearly: who the AI should act as, what you want done, the background it needs, the rules it must follow, and the shape the answer should take. Zawadie calls this RTCRO — Role, Task, Context, Rules, Output Format.',
        'You don\'t need all five in every prompt, but knowing the slots means you can debug a weak prompt fast: read it back and ask which slot is missing. Most bad outputs trace back to exactly one of these being left blank.',
      ],
      framework: {
        role: 'Who the AI should act as — an expert, a persona, a point of view. Sets tone and priorities.',
        task: 'The specific action you want, stated as a clear instruction with a concrete deliverable.',
        context: 'Background facts, audience, or material the AI needs but doesn\'t already have.',
        rules: 'Constraints — things to include, avoid, or never do.',
        outputFormat: 'The exact shape of the answer: length, structure, tone.',
      },
      before: 'Summarize this.',
      after:
        'You are a business analyst. Summarize this report into five bullet points, identify risks, and recommend three actions.',
      challenge: {
        prompt:
          "Using the RTCRO framework, rewrite this poor prompt into a professional one: 'Summarize this.'",
        placeholder: 'e.g. You are a ... Summarize this into ... Also flag ... Format: ...',
        criteria: [
          { label: 'Assigns a role (e.g. "You are a...")', points: 5, test: hasRoleCue },
          { label: 'Specifies an output format (bullets, sections, a length)', points: 5, test: hasFormatCue },
          {
            label: 'Adds a rule or extra requirement (e.g. flag risks, recommend actions)',
            points: 5,
            test: (text) => hasConstraintCue(text) || containsAny(['risk', 'recommend', 'action'])(text),
          },
          { label: 'Detailed enough to act on (12+ words)', points: 5, test: hasMinWords(12) },
        ],
        sampleOutput:
          "Sure — here's a 5-bullet summary of the report covering the key numbers, two flagged risks, and three recommended next steps.",
        modelAnswer:
          'You are a business analyst. Summarize this report into five bullet points, identify risks, and recommend three actions.',
        modelAnswerNote:
          'RTCRO in one sentence: Role (business analyst), Task (summarize), Context (this report), Rules (identify risks), Output Format (five bullets + three actions).',
      },
    },
    {
      id: 'common-failure-modes',
      title: 'Common Failure Modes',
      teach: [
        'Most bad outputs trace back to a handful of prompt mistakes: being vague, assuming shared context the model doesn\'t have, or asking for too many things at once with no structure. Spotting the pattern speeds up the fix.',
        'When an output disappoints you, don\'t just ask for "better" — diagnose which RTCRO slot was empty, then fill only that one in.',
      ],
      before: 'Fix my code.',
      after:
        "In this Python function, requests are timing out after 30s. Fix the retry logic so it backs off exponentially up to 3 attempts, and explain the change.",
      challenge: {
        prompt: "Diagnose why this prompt fails, then rewrite it: 'Fix my code.'",
        placeholder: 'e.g. In this [language] function, [bug]. Fix it so that [expected behavior]...',
        criteria: [
          {
            label: 'Names the language, error, or bug',
            points: 5,
            test: containsAny(['bug', 'error', 'timeout', 'crash', 'fails', 'exception', 'python', 'javascript', 'code']),
          },
          { label: 'States the expected/fixed behavior', points: 5, test: hasFormatCue },
          { label: 'Detailed enough to act on (10+ words)', points: 5, test: hasMinWords(10) },
        ],
        sampleOutput:
          'The original prompt gives no context about the language, the bug, or the expected behavior — here is a corrected version with those specifics filled in.',
        modelAnswer:
          "In this Python function, requests are timing out after 30s. Fix the retry logic so it backs off exponentially up to 3 attempts, and explain the change.",
        modelAnswerNote:
          'This names the language, the exact symptom, and the fix criteria — the AI no longer has to guess what "fix" means.',
      },
    },
  ],
}
