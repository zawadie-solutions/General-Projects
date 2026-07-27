import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MessageSquareText, Sparkles, Target, Trophy } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

const steps = [
  {
    icon: MessageSquareText,
    title: 'Read a short lesson',
    text: 'Plain-language explanations with real before/after examples — no jargon.',
  },
  {
    icon: Target,
    title: 'Practice on real exercises',
    text: 'Rewrite weak prompts, write your own, and spot what went wrong — get feedback instantly.',
  },
  {
    icon: Trophy,
    title: 'Level up',
    text: 'Earn points, badges, and streaks as you unlock harder levels.',
  },
]

export function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          No tech background needed
        </span>
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">
          Learn to talk to AI like you actually mean it.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-text-soft sm:text-lg">
          A short, game-like course that teaches you how to write prompts that
          get you better answers from tools like Claude and ChatGPT — in
          plain English, with practice as you go.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/levels/foundation">
            <Button className="px-6 py-3 text-base">
              Start Learning <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/levels">
            <Button variant="secondary" className="px-6 py-3 text-base">
              See All Levels
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-16 grid gap-4 sm:grid-cols-3"
      >
        {steps.map((step) => (
          <Card key={step.title} className="text-left">
            <step.icon className="mb-3 h-6 w-6 text-accent" />
            <h3 className="mb-1 font-bold text-heading">{step.title}</h3>
            <p className="text-sm text-text-soft">{step.text}</p>
          </Card>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-16"
      >
        <Card className="flex flex-col items-center gap-4 bg-gradient-to-br from-accent-soft/50 to-transparent text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="mb-1 text-lg font-bold text-heading">
              5 levels, from zero to confident
            </h3>
            <p className="text-sm text-text-soft">
              Foundation → Core Skills → Intermediate → Advanced → Mastery.
              Each one unlocks after you pass a short quiz.
            </p>
          </div>
          <Link to="/levels">
            <Button variant="secondary">View the map</Button>
          </Link>
        </Card>
      </motion.div>
    </div>
  )
}
