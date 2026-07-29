export interface AuthUser {
  id: number
  email: string
  displayName: string
}

export interface RemoteProgress {
  points: number
  streak: number
  lastActiveDate: string | null
  completedExercises: Record<string, number>
  quizPassed: { examPassed?: boolean; examScore?: number; examAttempted?: boolean }
  badges: string[]
}

export interface LeaderboardEntry {
  displayName: string
  points: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
  signUp: (body: { email: string; displayName: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  signIn: (body: { email: string; password: string }) =>
    request<{ user: AuthUser; progress: RemoteProgress | null }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  signOut: () => request<{ ok: true }>('/auth/signout', { method: 'POST' }),
  me: () => request<{ user: AuthUser | null; progress: RemoteProgress | null }>('/auth/me'),
  leaderboard: () => request<{ entries: LeaderboardEntry[] }>('/leaderboard'),
  saveProgress: (body: RemoteProgress) =>
    request<{ ok: true }>('/progress', { method: 'PUT', body: JSON.stringify(body) }),
}
