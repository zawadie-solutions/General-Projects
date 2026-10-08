import type { ModuleContent } from '../types'
import { containsAny, hasMinWords } from '../../lib/heuristics'

export const evaluationResponsibleContent: ModuleContent = {
  id: 'evaluation-responsible',
  lessons: [
    {
      id: 'testing-systematically',
      title: 'Testing Prompts Systematically',
      teach: [
        "Run the same prompt against a small set of representative inputs, including edge cases, before trusting it in production. One good result isn't proof it's reliable — it's proof it worked once.",
      ],
      before: 'It worked once, ship it.',
      after:
        'Test against 5 representative inputs including 2 edge cases. Only ship if all 5 outputs meet the format and accuracy bar.',
      challenge: {
        prompt: "List 3 edge-case inputs you'd test a prompt against before trusting it.",
        placeholder: 'e.g. An empty input, a very long input, an ambiguous or contradictory request...',
        criteria: [
          { label: 'Names at least 3 distinct test cases', points: 5, test: hasMinWords(10) },
          { label: 'Includes at least one genuine edge case, not just typical inputs', points: 5, test: containsAny(['empty', 'long', 'ambiguous', 'malformed', 'edge case', 'unusual', 'contradictory']) },
        ],
        sampleOutput:
          'Test set defined — includes an empty input, a very long input, and an ambiguous request.',
        modelAnswer:
          'Build a small test set covering the typical case, an edge case, and an adversarial or malformed case.',
        modelAnswerNote:
          'Three tiers — typical, edge, and adversarial — catch most of what production traffic will actually throw at a prompt.',
      },
    },
    {
      id: 'bias-hallucination',
      title: 'Spotting Bias & Hallucination',
      teach: [
        "Models can state confident-sounding facts that are wrong, or reflect skewed patterns from training data. Ask for sources or reasoning when accuracy matters, and verify anything you can't independently check.",
      ],
      before: "What's the correct answer?",
      after:
        'Answer, then state your confidence and what could make this answer wrong. Cite where this fact would typically come from.',
      challenge: {
        prompt: 'Add a confidence + reasoning check to a factual prompt you use often.',
        placeholder: 'e.g. Answer, then state your confidence level and what would verify this claim...',
        criteria: [
          { label: 'Asks for a stated confidence level', points: 5, test: containsAny(['confidence', 'how sure', 'certain']) },
          { label: 'Asks what would verify or disprove the claim', points: 5, test: containsAny(['verify', 'source', 'wrong', 'disprove', 'check']) },
        ],
        sampleOutput:
          'Answer given with a stated confidence level and a note on what data would confirm it.',
        modelAnswer:
          'Ask the model to flag uncertainty and name what would verify the claim, not just state the answer.',
        modelAnswerNote:
          'A confidently-worded answer and a correct answer are not the same thing — asking for confidence separates the two.',
      },
    },
    {
      id: 'review-checklist',
      title: 'Zawadie Prompt Review Checklist',
      teach: [
        "Before sharing a prompt with a client or shipping it into a workflow, run it through Zawadie's 4-point check — which is really just RTCRO with a testing gate on top: clear task, sufficient context, explicit format, and tested against edge cases.",
      ],
      before: 'Send it, looks fine.',
      after:
        'Checklist: task is explicit / context included / output format specified / tested on 3+ inputs. All pass — approved to ship.',
      challenge: {
        prompt: 'Run one of your own prompts through the 4-point checklist and note what is missing.',
        placeholder: 'e.g. Task: explicit ✓. Context: missing — need to add the audience. Format: ✓. Tested: not yet, need 3 inputs.',
        criteria: [
          { label: 'Addresses all 4 checklist items (task, context, format, tested)', points: 5, test: (text) => ['task', 'context', 'format', 'test'].filter((k) => text.toLowerCase().includes(k)).length >= 3 },
          { label: 'Identifies at least one specific gap', points: 5, test: containsAny(['missing', 'need to', 'not yet', 'gap', "doesn't"]) },
        ],
        sampleOutput:
          'Three of four checks passed — output format was not specified, so results varied between runs.',
        modelAnswer:
          'Task / Context / Format / Tested — do not ship until all four are true.',
        modelAnswerNote:
          'This checklist is the RTCRO framework compressed into a ship/no-ship gate.',
      },
    },
  ],
  comparisonLesson: {
    id: 'comparing-scoring-responses',
    title: 'Comparing & Scoring AI Responses',
    teach: [
      "Companies evaluate AI responses against a consistent set of metrics rather than a gut feeling: Accuracy (are the facts correct), Completeness (does it cover everything asked), Helpfulness (does it actually solve the user's problem), Truthfulness (does it avoid overstating certainty), Safety (does it avoid harmful or inappropriate content), Formatting (does it follow the requested structure), and Hallucination Detection (does it invent facts, sources, or details not in evidence).",
      "Below is one prompt and five real-looking responses to it. Score each response, then compare your ranking to the reference scoring.",
    ],
    promptShown:
      'Summarize the key risks in this vendor contract and recommend whether we should sign it.',
    metrics: [
      { key: 'accuracy', label: 'Accuracy', description: 'Are the stated facts correct?' },
      { key: 'completeness', label: 'Completeness', description: 'Does it cover everything the prompt asked for?' },
      { key: 'helpfulness', label: 'Helpfulness', description: 'Does it actually help the reader decide?' },
      { key: 'truthfulness', label: 'Truthfulness', description: 'Does it avoid overstating certainty?' },
      { key: 'safety', label: 'Safety', description: 'Does it avoid risky or inappropriate advice?' },
      { key: 'formatting', label: 'Formatting', description: 'Does it follow a clear, usable structure?' },
      { key: 'hallucinationFree', label: 'Hallucination Detection', description: 'Does it avoid inventing facts not in the contract?' },
    ],
    responses: [
      {
        id: 'r1',
        label: 'Response A',
        text: 'Sign it. The contract is fine.',
        scores: { accuracy: 2, completeness: 1, helpfulness: 1, truthfulness: 2, safety: 3, formatting: 1, hallucinationFree: 3 },
      },
      {
        id: 'r2',
        label: 'Response B',
        text: 'Key risks: (1) auto-renewal with only a 60-day opt-out window, (2) no cap on liability for the vendor, (3) termination-for-convenience is one-sided in the vendor\'s favor. Recommendation: negotiate the liability cap and termination terms before signing.',
        scores: { accuracy: 5, completeness: 5, helpfulness: 5, truthfulness: 5, safety: 5, formatting: 4, hallucinationFree: 5 },
      },
      {
        id: 'r3',
        label: 'Response C',
        text: 'This contract also includes a mandatory arbitration clause in Delaware and a data-residency requirement in the EU, both of which are common and low-risk. Recommend signing as-is.',
        scores: { accuracy: 2, completeness: 3, helpfulness: 2, truthfulness: 2, safety: 3, formatting: 3, hallucinationFree: 1 },
      },
      {
        id: 'r4',
        label: 'Response D',
        text: 'Risks: auto-renewal clause, liability cap missing, termination terms one-sided. I am not able to give a definitive recommendation — you should have this reviewed by legal counsel before signing.',
        scores: { accuracy: 4, completeness: 4, helpfulness: 3, truthfulness: 5, safety: 5, formatting: 3, hallucinationFree: 5 },
      },
      {
        id: 'r5',
        label: 'Response E',
        text: '1. Auto-renewal (60-day opt-out)\n2. No liability cap\n3. One-sided termination clause\n\nRecommendation: Do not sign until the liability cap and termination clause are renegotiated.',
        scores: { accuracy: 5, completeness: 5, helpfulness: 5, truthfulness: 4, safety: 5, formatting: 5, hallucinationFree: 5 },
      },
    ],
    bestResponseId: 'r5',
    explanation:
      'Response E and Response B are both strong — accurate, complete, and correctly formatted — but E edges ahead on formatting (a clean numbered list) and gives a clearer, more actionable recommendation. Response C scores lowest on Hallucination Detection: it introduces specific clauses (arbitration in Delaware, EU data residency) that were never in the contract. Response A is too vague to be useful despite being harmless. Response D is safe and honest but punts on the actual task the prompt asked for — a recommendation.',
  },
}
