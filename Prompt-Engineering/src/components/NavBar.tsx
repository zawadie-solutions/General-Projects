import { Link, NavLink } from 'react-router-dom'
import { Flame, Sparkles } from 'lucide-react'
import { useProgress } from '../store/progress'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-accent' : 'text-text-soft hover:text-heading'
  }`

export function NavBar() {
  const { points, rankName, streak } = useProgress()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-heading">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">PromptCraft</span>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text-soft sm:order-3">
          <span className="flex items-center gap-1 text-warn">
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="text-heading">{points} pts</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-accent">{rankName}</span>
        </div>

        <nav className="order-4 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-border pt-2 sm:order-2 sm:w-auto sm:justify-start sm:gap-x-5 sm:border-t-0 sm:pt-0">
          <NavLink to="/levels" className={navLinkClass}>
            Levels
          </NavLink>
          <NavLink to="/daily-challenge" className={navLinkClass}>
            Daily Challenge
          </NavLink>
          <NavLink to="/prompt-battle" className={navLinkClass}>
            Prompt Battle
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>
            Leaderboard
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
