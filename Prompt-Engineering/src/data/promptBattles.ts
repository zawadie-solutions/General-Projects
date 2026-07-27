export interface PromptBattle {
  id: string
  topic: string
  promptA: string
  outputA: string
  promptB: string
  outputB: string
  betterId: 'a' | 'b'
  explanation: string
}

export const PROMPT_BATTLES: PromptBattle[] = [
  {
    id: '1',
    topic: 'Asking for restaurant recommendations',
    promptA: 'Where should I eat?',
    outputA:
      'There are many great restaurants depending on your taste! Italian, Mexican, Japanese, and Thai are all popular cuisines. You could also try a local diner or a well-reviewed spot near you.',
    promptB:
      "I'm in Chicago for one night and want a casual, budget-friendly Thai restaurant within walking distance of downtown. Give me 2 options with a one-line reason for each.",
    outputB:
      "1) Thai Village — casual counter-service spot known for affordable pad see ew, a short walk from the Loop. 2) Aroy Thai Kitchen — small BYOB spot with generous portions, popular with downtown office workers for lunch.",
    betterId: 'b',
    explanation:
      'Prompt B locks in the city, budget, cuisine, and location, so the AI can give two real, checkable suggestions instead of a generic list of cuisine types.',
  },
  {
    id: '2',
    topic: 'Explaining a concept to a kid',
    promptA: 'Explain photosynthesis.',
    outputA:
      'Photosynthesis is the process by which plants convert light energy into chemical energy, using carbon dioxide and water to produce glucose and oxygen through a series of reactions in the chloroplast.',
    promptB: 'Explain photosynthesis to a curious 7-year-old, using a simple analogy, in 3 sentences.',
    outputB:
      "Plants are like tiny chefs! They use sunlight as their stove, and water and air as their ingredients, to cook up their own food. As a bonus, they breathe out fresh air for us to enjoy!",
    betterId: 'b',
    explanation:
      'Prompt B sets the audience and tone, so the AI swaps technical vocabulary for a simple analogy — a much better fit for a 7-year-old than the textbook definition.',
  },
  {
    id: '3',
    topic: "Writing a social media caption",
    promptA: "Write a caption for my coffee shop's Instagram post.",
    outputA: 'Check out our delicious coffee! Come visit us today. #coffee #cafe #yum',
    promptB:
      'Write a short, witty Instagram caption for a photo of a latte with heart-shaped foam art, for a cozy neighborhood coffee shop. Include 2 relevant hashtags, no more.',
    outputB: "Foam so cute we almost didn't want to drink it (almost). ☕ #LatteArt #NeighborhoodCafe",
    betterId: 'b',
    explanation:
      'Prompt B describes the actual photo, sets a tone (witty), and caps the hashtags — so the caption fits the specific image instead of reading like a generic ad.',
  },
  {
    id: '4',
    topic: 'Debugging help',
    promptA: "My app doesn't work.",
    outputA:
      "I'm sorry to hear that! Could you tell me more about what's happening? There could be many reasons an app might not work, such as bugs, network issues, or configuration problems.",
    promptB:
      "My React app shows a blank white screen after I click 'Submit' on the login form, and the browser console shows 'Cannot read properties of undefined (reading email)'. What's likely causing this?",
    outputB:
      "That error usually means your code is trying to read `.email` from a variable that's `undefined` — most likely the form data object hasn't been set yet when the submit handler runs. Check that your state (e.g. `formData`) is initialized before the handler fires, and that the field name matches exactly.",
    betterId: 'b',
    explanation:
      'Prompt B includes the actual error message and when it happens, which lets the AI point to a specific, likely cause instead of listing generic troubleshooting categories.',
  },
  {
    id: '5',
    topic: 'Asking for a workout plan',
    promptA: 'Give me a workout plan.',
    outputA:
      'Sure! A good workout plan usually includes cardio, strength training, and rest days. You could do 3-4 days of exercise per week, mixing things like running, weightlifting, and stretching.',
    promptB:
      'Act as a personal trainer. Give me a 3-day beginner strength workout I can do at home with just dumbbells, 30 minutes per session. Format it as a day-by-day list.',
    outputB:
      'Day 1 (Upper Body): Dumbbell rows x12, shoulder press x12, bicep curls x12, tricep kickbacks x12 — 3 sets each.\nDay 2 (Lower Body): Goblet squats x15, lunges x12/leg, calf raises x20 — 3 sets each.\nDay 3 (Full Body): Dumbbell deadlifts x12, push-ups x10, plank 30s — 3 sets each.',
    betterId: 'b',
    explanation:
      'Prompt B assigns a role, sets the equipment, time, and format — so the AI returns an actual usable plan instead of general workout advice.',
  },
]
