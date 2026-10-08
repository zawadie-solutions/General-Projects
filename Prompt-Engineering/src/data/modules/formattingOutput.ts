import type { ModuleContent } from '../types'
import { containsAny, hasFormatCue, hasMinWords } from '../../lib/heuristics'

const countVariables = (text: string) => (text.match(/\{\{.*?\}\}/g) ?? []).length

export const formattingOutputContent: ModuleContent = {
  id: 'formatting-output',
  lessons: [
    {
      id: 'structured-output',
      title: 'Requesting Structured Output (JSON, Tables)',
      teach: [
        'Naming the exact format and giving a schema or example drastically improves consistency — this matters most when the output feeds another system, not just a human reader.',
        'When you need JSON, name the exact keys and types you want. Models will happily invent plausible-looking keys if you don\'t specify them, and that inconsistency breaks downstream parsing.',
      ],
      before: 'Give me the data from this email.',
      after:
        'Extract sender, date, and requested amount from this email as JSON with keys: sender, date, amount.',
      challenge: {
        prompt: 'Ask for the same information twice: once unstructured, once as a JSON schema with named keys.',
        placeholder: 'e.g. Extract sender, date, and amount from this email as JSON with keys: sender, date, amount.',
        criteria: [
          { label: 'Names JSON, a table, or another structured format', points: 5, test: containsAny(['json', 'table', 'csv', 'schema', 'keys:']) },
          { label: 'Lists the exact fields or columns wanted', points: 5, test: hasMinWords(8) },
        ],
        sampleOutput: '{ "sender": "...", "date": "...", "amount": "..." }',
        modelAnswer:
          'Specify the exact JSON keys and types you want, and show one example object if the schema is non-obvious.',
        modelAnswerNote:
          'Naming the keys up front means you get the same shape every time, instead of a slightly different structure per request.',
      },
    },
    {
      id: 'style-tone-persona',
      title: 'Style, Tone & Persona Control',
      teach: [
        'State tone explicitly (formal, casual, reassuring) rather than trusting the model to guess it from context. A short persona description works better than a single mood word.',
        'Tone and role prompting overlap but aren\'t identical: role sets who is speaking, tone sets how they sound. You can combine both — a role gives expertise, a stated tone controls warmth and formality independently of it.',
      ],
      before: 'Make this email nicer.',
      after:
        'Rewrite this email in a warm, reassuring tone, as if written by a supportive account manager. Keep it under 120 words.',
      challenge: {
        prompt: 'Write the same request in two tones: a formal executive memo vs. a friendly Slack message.',
        placeholder: 'e.g. Formal: Write this as a formal executive memo... / Casual: Write this as a quick, friendly Slack message...',
        criteria: [
          { label: 'Names two distinct tones or styles', points: 5, test: containsAny(['formal', 'casual', 'friendly', 'professional', 'playful']) },
          { label: 'Gives a length or medium for each', points: 5, test: hasFormatCue },
        ],
        sampleOutput:
          'Two versions produced — one formal and structured, one casual and conversational — same core content.',
        modelAnswer:
          'Describe the voice as a short persona (role + trait), not just a mood word, and give a word limit.',
        modelAnswerNote:
          '"Warm, reassuring, like a supportive account manager" gives the model far more to work with than "nicer."',
      },
    },
    {
      id: 'constraining-length',
      title: 'Constraining Length & Format',
      teach: [
        "Be specific about length (words, sentences, bullets) and structure (headings, no headings). Vague asks like 'keep it short' get inconsistent results because 'short' means something different every time.",
      ],
      before: 'Keep it brief.',
      after: 'Respond in exactly 3 bullet points, each under 15 words, no intro sentence.',
      challenge: {
        prompt: 'Add an exact length and structure constraint to a prompt you use often.',
        placeholder: 'e.g. Respond in exactly 3 bullet points, each under 15 words, no intro sentence.',
        criteria: [
          { label: 'Gives an exact count (a number)', points: 5, test: (text) => /\d/.test(text) },
          { label: 'Names the unit or structure (bullets, sentences, words)', points: 5, test: hasFormatCue },
        ],
        sampleOutput: 'Response delivered as exactly 3 bullets, 15 words or fewer each, no preamble.',
        modelAnswer:
          "State the exact count and unit (e.g. '3 bullets, 15 words each') instead of a relative word like 'short'.",
        modelAnswerNote:
          'Numbers are unambiguous. "Short," "brief," and "concise" all mean different things to different models on different days.',
      },
    },
    {
      id: 'prompt-templates',
      title: 'Prompt Templates & Libraries',
      teach: [
        'A prompt template is a reusable prompt with placeholders — variables like {{customer_name}} or {{topic}} — that you fill in each time instead of writing the whole thing from scratch. RTCRO maps naturally onto templates: each slot (role, task, context, rules, format) becomes a variable you swap out per use.',
        'A prompt library is a shared, versioned collection of vetted templates for the tasks your team does repeatedly. The point isn\'t just convenience — it means nobody starts from a blank page, and a template that\'s been tested and improved once benefits everyone who reuses it, instead of everyone independently reinventing (and re-breaking) the same prompt.',
      ],
      before: 'Write a follow-up email to a customer.',
      after:
        'Template: "You are a {{role}} writing a follow-up email to {{customer_name}} about {{topic}}. Tone: {{tone}}. Keep it under {{word_limit}} words." — fill in the variables for each new customer.',
      challenge: {
        prompt:
          "Turn this one-off prompt into a reusable template with at least two {{variables}}: 'Write a product description for our new blender.'",
        placeholder: 'e.g. Write a product description for {{product_name}}, highlighting {{key_features}}, for {{audience}}...',
        criteria: [
          { label: 'Uses at least one {{variable}} placeholder', points: 5, test: (text) => countVariables(text) >= 1 },
          { label: 'Uses at least two variables', points: 5, test: (text) => countVariables(text) >= 2 },
          { label: 'Still reads as a complete, usable prompt', points: 5, test: hasMinWords(8) },
        ],
        sampleOutput:
          'Template accepted — swap in {{product_name}} and {{key_features}} and it produces a usable description for any product in the catalog.',
        modelAnswer:
          'Write a product description for {{product_name}}, highlighting {{key_features}}, for {{audience}}. Keep it under {{word_limit}} words.',
        modelAnswerNote:
          'Four variables, one template — this now covers every product launch instead of being rewritten each time.',
      },
    },
  ],
}
