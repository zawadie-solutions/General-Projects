import type { ModuleContent } from '../types'
import { containsAny, hasFormatCue, hasMinWords, hasRoleCue } from '../../lib/heuristics'

export const instructionContextContent: ModuleContent = {
  id: 'instruction-context',
  lessons: [
    {
      id: 'being-explicit',
      title: 'Being Explicit: Clarity Over Cleverness',
      teach: [
        'Models follow instructions literally. Say exactly what you want, in the order you want it, rather than implying it and hoping the model infers correctly.',
        'Politeness padding ("if it\'s not too much trouble") doesn\'t help the model — it just buries the actual instruction. Say the ask plainly and put the constraint front and center.',
      ],
      before: "Can you maybe shorten this a bit if it's not too much trouble?",
      after: 'Shorten this to under 50 words. Keep the first and last sentence unchanged.',
      challenge: {
        prompt: "Rewrite a polite-but-vague request you'd send a coworker into an explicit instruction.",
        placeholder: 'e.g. Shorten this email to 3 sentences. Keep the greeting and sign-off unchanged.',
        criteria: [
          { label: 'States the action as a direct instruction', points: 5, test: hasMinWords(6) },
          { label: 'Gives an exact limit or constraint (a number, a rule)', points: 5, test: hasFormatCue },
        ],
        sampleOutput:
          'Rewritten — the ask now states the exact word limit and which sentences must stay untouched.',
        modelAnswer: 'Shorten this email to 3 sentences. Keep the greeting and sign-off exactly as written.',
        modelAnswerNote:
          'No hedging, no "maybe" — a number and a hard rule, stated once.',
      },
    },
    {
      id: 'shot-prompting',
      title: 'Zero-Shot, One-Shot & Few-Shot Prompting',
      teach: [
        'Zero-shot means asking directly with no examples — it works when the task is common and the model already understands the pattern (e.g. "translate this to French"). One-shot gives exactly one example, useful when the format is unusual but a single sample makes it obvious. Few-shot gives 2-3 examples, and is the right call when you need a specific format, tone, or edge-case handling that\'s hard to describe in words alone.',
        'Rule of thumb: try zero-shot first. If the output format or tone keeps coming back wrong, add one example. If it\'s still inconsistent, add two or three — each example should show the model something the others didn\'t.',
      ],
      before: 'Classify this support ticket.',
      after:
        'Here are 3 examples of tickets and their correct category labels: [examples]. Now classify this new ticket the same way: [ticket].',
      challenge: {
        prompt:
          'Take a classification or formatting task from your work and write both a zero-shot version and a few-shot version (with 2-3 example input/output pairs).',
        placeholder: 'e.g. Zero-shot: Classify this ticket as Billing, Bug, or Feedback: [ticket]\nFew-shot: Example 1: ... -> Billing. Example 2: ... -> Bug. Now classify: [ticket]',
        criteria: [
          { label: 'Includes at least one labeled example', points: 5, test: containsAny(['example', '->', ':', 'e.g.']) },
          { label: 'States the categories or output labels explicitly', points: 5, test: hasMinWords(10) },
        ],
        sampleOutput:
          'Category: Billing — matches the pattern from your example #2 (a payment-method question).',
        modelAnswer:
          'Provide 2-3 labeled examples matching your exact category names, then ask the model to label the new item the same way.',
        modelAnswerNote:
          'Few-shot examples do the explaining for you — they show the model your exact category boundaries instead of describing them in prose.',
      },
    },
    {
      id: 'context-engineering',
      title: 'Context Engineering: Giving the Model What It Needs',
      teach: [
        'The model only knows what\'s in the conversation. If a task depends on internal facts — a policy, a dataset, a prior decision — paste it in or summarize it; never assume the model already knows.',
        '"Context engineering" is the practice of deciding what to include and what to leave out: too little and the model guesses, too much irrelevant material and the model gets distracted or the important facts get buried. Curate, don\'t dump.',
      ],
      before: 'Does this comply with our return policy?',
      after:
        'Our return policy: [paste policy]. Does the following customer request comply with it? [request]',
      challenge: {
        prompt:
          "Pick a prompt you'd normally send without context, and add the 2-3 specific facts the model actually needs.",
        placeholder: 'e.g. Our policy states: ... Given that, does this request qualify? ...',
        criteria: [
          { label: 'Includes specific background facts, not just a topic', points: 5, test: hasMinWords(15) },
          { label: 'Signals what the context is for (a decision, a comparison)', points: 5, test: containsAny(['does this', 'given', 'based on', 'according to', 'compare']) },
        ],
        sampleOutput:
          'Based on the policy you provided, this request qualifies for a refund since it is within the 30-day window.',
        modelAnswer:
          'Paste the relevant policy or data directly into the prompt before asking the model to reason about it.',
        modelAnswerNote:
          'The model reasoned correctly because the exact rule was in front of it — not because it "knew" your company policy.',
      },
    },
    {
      id: 'role-prompting',
      title: 'Role Prompting',
      teach: [
        'Assigning a role shapes the model\'s vocabulary, priorities, and tone before it writes a single word. "You are a senior security engineer" produces very different output than "you are a friendly customer support rep," even for the same underlying question.',
        'Vague roles barely help — "you are an expert" is close to no role at all. Specific roles work: name the discipline, the seniority, or the exact lens you want ("a skeptical pricing consultant," not just "a consultant").',
      ],
      before: 'What do you think about this pricing strategy?',
      after:
        'You are a SaaS pricing consultant with 10 years of experience. Critique this pricing strategy for a mid-market B2B tool and flag any risks.',
      challenge: {
        prompt: "Add a specific, well-chosen role to this prompt: 'Review this contract clause.'",
        placeholder: 'e.g. You are a contracts lawyer specializing in ... Review this clause for ...',
        criteria: [
          { label: 'Assigns a role with "You are..." or "Act as..."', points: 5, test: hasRoleCue },
          { label: 'Role is specific, not generic (names a field or seniority)', points: 5, test: hasMinWords(8) },
        ],
        sampleOutput:
          'As a contracts lawyer, I\'d flag that this clause lacks a termination-for-convenience option — here is the specific risk and a suggested rewrite.',
        modelAnswer:
          'You are a contracts lawyer specializing in SaaS vendor agreements. Review this clause for anything that unfairly favors the vendor.',
        modelAnswerNote:
          'The role names both the discipline (contracts lawyer) and the specialization (SaaS vendor agreements) — that specificity is what changes the answer.',
      },
    },
  ],
}
