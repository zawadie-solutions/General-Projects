import type { ModuleContent } from '../types'
import { containsAny, hasConstraintCue, hasMinWords } from '../../lib/heuristics'

export const toolsAgentsContent: ModuleContent = {
  id: 'tools-agents',
  lessons: [
    {
      id: 'tool-use',
      title: 'Prompting for Tool Use',
      teach: [
        "When a model can call tools (search, calculators, internal APIs), describe each tool's purpose and exact input format clearly — ambiguous tool descriptions cause wrong or wasted calls.",
        'Also say when *not* to call a tool. Models given a hammer tend to see nails — an unconstrained tool description often gets called more often than it should.',
      ],
      before: 'Use the search tool if you need to.',
      after:
        'Use the lookup_customer(email) tool only when the user provides an email you do not already have. Never call it more than once per turn.',
      challenge: {
        prompt: 'Write a tool-use instruction for a hypothetical send_email(to, subject, body) tool.',
        placeholder: 'e.g. Call send_email only after the user confirms the recipient and content...',
        criteria: [
          { label: 'Names the tool and when to call it', points: 5, test: containsAny(['send_email', 'call', 'tool']) },
          { label: 'States a limit or condition on its use', points: 5, test: hasConstraintCue },
        ],
        sampleOutput: 'Tool instruction accepted — the model now knows exactly when and how to call send_email.',
        modelAnswer:
          'Call send_email only after the user confirms the recipient and content. Never call it twice for the same message.',
        modelAnswerNote:
          'A trigger condition plus a hard limit — that combination is what prevents accidental duplicate sends.',
      },
    },
    {
      id: 'multi-turn-agents',
      title: 'Designing Multi-Turn Agents',
      teach: [
        'In multi-turn flows, restate the goal and current state each turn so the model doesn\'t lose track across a long conversation. Don\'t rely on it remembering unstated context — treat every turn as if the model is rejoining mid-conversation.',
      ],
      before: 'Continue helping the user.',
      after:
        'Current goal: book a flight. Confirmed so far: destination = Nairobi, dates = Aug 3-6. Still needed: budget, class. Ask only for what is missing.',
      challenge: {
        prompt:
          "Write a 'state recap' line you'd include at the top of each turn in a multi-step booking flow.",
        placeholder: 'e.g. Goal: ... Confirmed: ... Still needed: ...',
        criteria: [
          { label: 'States the overall goal', points: 5, test: containsAny(['goal', 'trying to', 'booking', 'objective']) },
          { label: 'Lists what is confirmed vs. still needed', points: 5, test: containsAny(['confirmed', 'still need', 'missing', 'remaining']) },
        ],
        sampleOutput:
          'State recap accepted — the model asked only for the two missing fields instead of re-asking everything.',
        modelAnswer:
          'Restate what is confirmed and what is still needed at the start of every turn in a multi-turn flow.',
        modelAnswerNote:
          'This is cheap to write and prevents the single most common multi-turn failure: re-asking for information the user already gave.',
      },
    },
    {
      id: 'error-handling',
      title: 'Handling Errors & Edge Cases',
      teach: [
        "Tell the model explicitly what to do when it's unsure, when a tool fails, or when input is missing — otherwise it guesses silently, which is worse than asking.",
      ],
      before: 'Handle whatever comes up.',
      after:
        'If required information is missing, ask a clarifying question instead of guessing. If a tool call fails, say so plainly and suggest a next step.',
      challenge: {
        prompt: 'Add explicit error-handling instructions to a prompt for a customer-support assistant.',
        placeholder: 'e.g. If the order number is missing, ask for it. If the lookup fails, tell the customer and offer...',
        criteria: [
          { label: 'Covers a specific failure case (missing info, a failed call)', points: 5, test: containsAny(['missing', 'fails', 'unsure', 'error', "can't find"]) },
          { label: 'States what the model should do instead of guessing', points: 5, test: hasMinWords(10) },
        ],
        sampleOutput:
          'Error handling added — the assistant now asks for missing order numbers instead of assuming one.',
        modelAnswer:
          "Explicitly instruct: 'If X is missing/fails, do Y' for every likely failure point, rather than leaving it implicit.",
        modelAnswerNote:
          'Silent guessing is the failure mode you\'re trying to prevent — an explicit fallback beats an implicit one every time.',
      },
    },
    {
      id: 'agents-with-memory',
      title: 'Agents with Memory',
      teach: [
        'Memory lets an agent carry relevant facts across turns or sessions instead of starting cold every time. Short-term memory is just the current conversation; long-term memory means storing facts (a customer\'s plan tier, a past decision) and retrieving them in a later session.',
        '"Agents that learn" is often used loosely — in practice, most of what looks like learning is really structured memory plus retrieval, not the model\'s underlying weights changing. Be precise about which one you mean, and be deliberate about what gets remembered: memory means storing user data, so scope it narrowly and let people see or clear what\'s retained.',
      ],
      before: 'Just keep helping the customer.',
      after:
        "Remember the customer's name, plan tier, and any open issues across this conversation. Do not retain payment details beyond this session.",
      challenge: {
        prompt:
          'Design a memory policy for a customer-support agent: what should it remember between sessions, and what should it explicitly forget?',
        placeholder: 'e.g. Remember: name, plan tier, open issue history. Forget: payment details, one-time verification codes...',
        criteria: [
          { label: 'States what should be remembered', points: 5, test: containsAny(['remember', 'retain', 'store', 'keep']) },
          { label: 'States what should be forgotten or excluded', points: 5, test: containsAny(['forget', 'do not', "don't", 'never store', 'exclude']) },
          { label: 'Detailed enough to act on (15+ words)', points: 5, test: hasMinWords(15) },
        ],
        sampleOutput:
          'Memory policy accepted — the agent now retains plan tier and issue history across sessions, and discards payment details after each session ends.',
        modelAnswer:
          "Remember the customer's name, plan tier, and open issue history across sessions. Never retain payment details, verification codes, or anything beyond the current session's purpose.",
        modelAnswerNote:
          'A good memory policy is really a privacy policy: name exactly what stays and what gets discarded, don\'t leave it implicit.',
      },
    },
  ],
}
