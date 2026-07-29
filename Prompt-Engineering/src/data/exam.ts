import type { QuizQuestion } from './types'

export const EXAM_QUESTIONS: QuizQuestion[] = [
  // Foundations
  {
    id: 'ex-1',
    moduleId: 'foundations',
    question: 'Why does a vague prompt usually lead to a vague answer?',
    options: [
      { id: 'a', text: "The model fills missing details with a generic, average guess" },
      { id: 'b', text: 'Vague prompts confuse the model\'s software' },
      { id: 'c', text: 'The model is intentionally being unhelpful' },
    ],
    correctId: 'a',
    explanation: 'The model only knows what you tell it — gaps get filled with the most average answer possible.',
  },
  {
    id: 'ex-2',
    moduleId: 'foundations',
    question: 'What does the "R" stand for in the RTCRO framework?',
    options: [
      { id: 'a', text: 'Reasoning' },
      { id: 'b', text: 'Role' },
      { id: 'c', text: 'Response' },
    ],
    correctId: 'b',
    explanation: 'RTCRO = Role, Task, Context, Rules, Output Format.',
  },
  {
    id: 'ex-3',
    moduleId: 'foundations',
    question: 'A prompt gets a disappointing answer. What should you do first?',
    options: [
      { id: 'a', text: 'Ask the model to "try again, but better"' },
      { id: 'b', text: 'Diagnose which RTCRO slot (role, task, context, rules, format) was left empty' },
      { id: 'c', text: 'Switch to a different AI tool' },
    ],
    correctId: 'b',
    explanation: 'Most disappointing answers trace back to exactly one missing RTCRO element — find it and fill only that one in.',
  },

  // Instruction & Context
  {
    id: 'ex-4',
    moduleId: 'instruction-context',
    question: 'When is few-shot prompting the better choice over zero-shot?',
    options: [
      { id: 'a', text: 'When the task is common and the model already understands the pattern' },
      { id: 'b', text: 'When you need a specific format, tone, or edge-case handling that\'s hard to describe in words' },
      { id: 'c', text: 'When you want the shortest possible prompt' },
    ],
    correctId: 'b',
    explanation: 'Examples show the model exactly what you mean when a text description alone leaves too much ambiguity.',
  },
  {
    id: 'ex-5',
    moduleId: 'instruction-context',
    question: 'What is "context engineering"?',
    options: [
      { id: 'a', text: 'Writing prompts in a formal register' },
      { id: 'b', text: 'Deciding what background information to include and exclude so the model has what it needs without being distracted by irrelevant material' },
      { id: 'c', text: 'Configuring the model\'s temperature setting' },
    ],
    correctId: 'b',
    explanation: 'Context engineering is curation, not dumping everything you have into the prompt.',
  },
  {
    id: 'ex-6',
    moduleId: 'instruction-context',
    question: 'Why is "you are an expert" a weak role prompt?',
    options: [
      { id: 'a', text: 'Models ignore role instructions entirely' },
      { id: 'b', text: 'It\'s too generic to change the model\'s vocabulary, priorities, or tone in any specific direction' },
      { id: 'c', text: 'Role prompts should never use the word "expert"' },
    ],
    correctId: 'b',
    explanation: 'Specific roles (discipline, seniority, lens) shape output; vague ones barely move the needle.',
  },

  // Reasoning & Structure
  {
    id: 'ex-7',
    moduleId: 'reasoning-structure',
    question: 'Chain-of-thought prompting is most useful for:',
    options: [
      { id: 'a', text: 'Simple one-line factual questions' },
      { id: 'b', text: 'Multi-step problems where an intermediate mistake would change the final answer' },
      { id: 'c', text: 'Making responses shorter' },
    ],
    correctId: 'b',
    explanation: 'For simple lookups, step-by-step reasoning just adds noise — save it for genuinely multi-step problems.',
  },
  {
    id: 'ex-8',
    moduleId: 'reasoning-structure',
    question: 'A prompt says "research competitors, summarize pricing, and write a positioning doc." What\'s the fix?',
    options: [
      { id: 'a', text: 'Shorten it to one sentence' },
      { id: 'b', text: 'Split it into ordered, numbered steps that build on each other' },
      { id: 'c', text: 'Add more adjectives' },
    ],
    correctId: 'b',
    explanation: 'Compound asks confuse models — break them into ordered sub-steps.',
  },
  {
    id: 'ex-9',
    moduleId: 'reasoning-structure',
    question: 'What makes a self-critique checklist effective?',
    options: [
      { id: 'a', text: 'A vague instruction like "review your work carefully"' },
      { id: 'b', text: '2-4 short, concrete criteria the model checks the draft against before finalizing' },
      { id: 'c', text: 'Asking the model to critique someone else\'s writing instead' },
    ],
    correctId: 'b',
    explanation: 'Concrete, short checklists reliably change output; vague "review it" instructions rarely do.',
  },

  // Formatting & Output
  {
    id: 'ex-10',
    moduleId: 'formatting-output',
    question: 'When requesting JSON output, what matters most for consistency?',
    options: [
      { id: 'a', text: 'Asking politely' },
      { id: 'b', text: 'Naming the exact keys and types you want' },
      { id: 'c', text: 'Keeping the prompt as short as possible' },
    ],
    correctId: 'b',
    explanation: 'Without named keys, models invent plausible-looking structures that vary between runs.',
  },
  {
    id: 'ex-11',
    moduleId: 'formatting-output',
    question: 'Why does "keep it short" produce inconsistent results?',
    options: [
      { id: 'a', text: '"Short" is a relative word with no fixed meaning across requests' },
      { id: 'b', text: 'Models can\'t count words' },
      { id: 'c', text: 'It\'s a role instruction, not a format instruction' },
    ],
    correctId: 'a',
    explanation: 'Exact counts and units (e.g. "3 bullets, 15 words each") remove the ambiguity relative words leave behind.',
  },
  {
    id: 'ex-12',
    moduleId: 'formatting-output',
    question: 'What is the point of a prompt library?',
    options: [
      { id: 'a', text: 'To store every prompt anyone has ever written, unreviewed' },
      { id: 'b', text: 'A shared, versioned collection of vetted templates so teams reuse tested prompts instead of reinventing them' },
      { id: 'c', text: 'A way to make prompts shorter automatically' },
    ],
    correctId: 'b',
    explanation: 'A template improved once benefits everyone who reuses it, instead of everyone independently re-breaking the same prompt.',
  },

  // Tools, Agents & Workflows
  {
    id: 'ex-13',
    moduleId: 'tools-agents',
    question: 'A good tool-use instruction should include:',
    options: [
      { id: 'a', text: 'Only the tool\'s name' },
      { id: 'b', text: 'When to call the tool, and a limit or condition on its use' },
      { id: 'c', text: 'Instructions to call every available tool on every turn' },
    ],
    correctId: 'b',
    explanation: 'Unconstrained tool descriptions get called more than they should — state the trigger condition and the limit.',
  },
  {
    id: 'ex-14',
    moduleId: 'tools-agents',
    question: 'In a multi-turn agent flow, what prevents the model from re-asking for information the user already gave?',
    options: [
      { id: 'a', text: 'Making the conversation shorter' },
      { id: 'b', text: 'Restating the goal and current state (confirmed vs. still needed) at the top of each turn' },
      { id: 'c', text: 'Increasing the model\'s context window' },
    ],
    correctId: 'b',
    explanation: 'A short state recap each turn keeps the model from losing track of what\'s already confirmed.',
  },
  {
    id: 'ex-15',
    moduleId: 'tools-agents',
    question: 'What is "agent memory" most accurately described as?',
    options: [
      { id: 'a', text: 'The model\'s weights permanently changing based on your conversations' },
      { id: 'b', text: 'Structured storage and retrieval of relevant facts across turns or sessions' },
      { id: 'c', text: 'A larger context window' },
    ],
    correctId: 'b',
    explanation: 'Most "agents that learn" are really structured memory plus retrieval, not the underlying model changing.',
  },

  // Evaluation & Responsible Use
  {
    id: 'ex-16',
    moduleId: 'evaluation-responsible',
    question: 'Why isn\'t "it worked once" enough to trust a prompt in production?',
    options: [
      { id: 'a', text: 'One good result proves it worked once, not that it\'s reliable across varied inputs' },
      { id: 'b', text: 'Prompts always fail the second time' },
      { id: 'c', text: 'Production systems require different wording than testing' },
    ],
    correctId: 'a',
    explanation: 'A representative test set — including edge cases — is what actually establishes reliability.',
  },
  {
    id: 'ex-17',
    moduleId: 'evaluation-responsible',
    question: 'Which of these is an example of "Hallucination Detection" failing?',
    options: [
      { id: 'a', text: 'A response cites a specific contract clause that was never actually in the document' },
      { id: 'b', text: 'A response is formatted as a numbered list' },
      { id: 'c', text: 'A response recommends not signing a contract' },
    ],
    correctId: 'a',
    explanation: 'Hallucination Detection checks whether the response invents facts, sources, or details not in evidence.',
  },
  {
    id: 'ex-18',
    moduleId: 'evaluation-responsible',
    question: "Zawadie's 4-point prompt review checklist covers task, context, format, and:",
    options: [
      { id: 'a', text: 'Tested against 3+ inputs' },
      { id: 'b', text: 'Written in formal English' },
      { id: 'c', text: 'Approved by two managers' },
    ],
    correctId: 'a',
    explanation: 'The checklist is RTCRO with a testing gate on top — don\'t ship until all four are true.',
  },
]
