import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type AuthUser, type RemoteProgress } from '../lib/api'

interface AuthApi {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, displayName: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<RemoteProgress | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signUp: AuthApi['signUp'] = async (email, displayName, password) => {
    const res = await api.signUp({ email, displayName, password })
    setUser(res.user)
  }

  const signIn: AuthApi['signIn'] = async (email, password) => {
    const res = await api.signIn({ email, password })
    setUser(res.user)
    return res.progress
  }

  const signOut = async () => {
    await api.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
