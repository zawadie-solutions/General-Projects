import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { LevelId } from '../data/types'
import { LEVELS } from '../data/levels'
import { rankForPoints } from '../lib/rank'
import { todayKey } from '../lib/date'
import { useAuth } from './auth'
import { api as backendApi, type RemoteProgress } from '../lib/api'

const STORAGE_KEY = 'pe-progress-v1'

interface ProgressState {
  points: number
  streak: number
  lastActiveDate: string | null
  completedExercises: Record<string, number>
  quizPassed: Partial<Record<LevelId, boolean>>
  badges: string[]
}

const emptyState: ProgressState = {
  points: 0,
  streak: 0,
  lastActiveDate: null,
  completedExercises: {},
  quizPassed: {},
  badges: [],
}

function loadState(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState
    return { ...emptyState, ...JSON.parse(raw) }
  } catch {
    return emptyState
  }
}

interface ProgressApi extends ProgressState {
  rankName: string
  isLevelUnlocked: (id: LevelId) => boolean
  isLevelComplete: (id: LevelId) => boolean
  recordExercise: (exerciseId: string, points: number) => void
  recordQuizPass: (levelId: LevelId, points: number) => void
  awardBadge: (badgeId: string) => void
  resetProgress: () => void
}

const ProgressContext = createContext<ProgressApi | null>(null)

function isEmptyRemote(p: RemoteProgress) {
  return (
    p.points === 0 &&
    p.streak === 0 &&
    p.lastActiveDate === null &&
    Object.keys(p.completedExercises).length === 0 &&
    Object.keys(p.quizPassed).length === 0 &&
    p.badges.length === 0
  )
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<ProgressState>(loadState)
  const stateRef = useRef(state)
  const hydratedForUserId = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // On sign-in, adopt real progress from the database (cross-device
  // restore). If the account is brand new, push local progress up instead
  // of overwriting it with empty defaults.
  useEffect(() => {
    if (!user) {
      hydratedForUserId.current = null
      return
    }
    if (hydratedForUserId.current === user.id) return
    hydratedForUserId.current = user.id

    backendApi
      .me()
      .then((res) => {
        if (res.progress && !isEmptyRemote(res.progress)) {
          setState({
            points: res.progress.points,
            streak: res.progress.streak,
            lastActiveDate: res.progress.lastActiveDate,
            completedExercises: res.progress.completedExercises,
            quizPassed: res.progress.quizPassed as Partial<Record<LevelId, boolean>>,
            badges: res.progress.badges,
          })
        } else {
          backendApi.saveProgress(stateRef.current).catch(() => {})
        }
      })
      .catch(() => {})
  }, [user])

  // Push local changes up to the database whenever signed in.
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => {
      backendApi.saveProgress(state).catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [user, state])

  useEffect(() => {
    const today = todayKey()
    setState((prev) => {
      if (prev.lastActiveDate === today) return prev
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const nextStreak = prev.lastActiveDate === yesterday ? prev.streak + 1 : 1
      return { ...prev, streak: nextStreak, lastActiveDate: today }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const api = useMemo<ProgressApi>(() => {
    const sortedLevels = [...LEVELS].sort((a, b) => a.order - b.order)

    const isLevelComplete = (id: LevelId) => Boolean(state.quizPassed[id])

    const isLevelUnlocked = (id: LevelId) => {
      const idx = sortedLevels.findIndex((l) => l.id === id)
      if (idx <= 0) return true
      const prevLevel = sortedLevels[idx - 1]
      return isLevelComplete(prevLevel.id)
    }

    const recordExercise = (exerciseId: string, points: number) => {
      setState((prev) => {
        const already = prev.completedExercises[exerciseId] ?? 0
        if (points <= already) return prev
        return {
          ...prev,
          points: prev.points - already + points,
          completedExercises: { ...prev.completedExercises, [exerciseId]: points },
        }
      })
    }

    const recordQuizPass = (levelId: LevelId, points: number) => {
      setState((prev) => ({
        ...prev,
        points: prev.points + points,
        quizPassed: { ...prev.quizPassed, [levelId]: true },
      }))
    }

    const awardBadge = (badgeId: string) => {
      setState((prev) =>
        prev.badges.includes(badgeId)
          ? prev
          : { ...prev, badges: [...prev.badges, badgeId] },
      )
    }

    const resetProgress = () => setState(emptyState)

    return {
      ...state,
      rankName: rankForPoints(state.points).name,
      isLevelUnlocked,
      isLevelComplete,
      recordExercise,
      recordQuizPass,
      awardBadge,
      resetProgress,
    }
  }, [state])

  return (
    <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
  )
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
