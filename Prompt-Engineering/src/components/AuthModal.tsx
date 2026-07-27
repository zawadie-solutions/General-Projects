import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, X } from 'lucide-react'
import { Button } from './Button'
import { useAuth } from '../store/auth'

const ALLOWED_EMAIL_DOMAIN = 'zawadie.com'

function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

export function AuthModal({
  onClose,
  initialMode = 'signin',
}: {
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && !isAllowedEmail(email)) {
      setError(`Sign up requires a @${ALLOWED_EMAIL_DOMAIN} email address`)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, displayName, password)
      } else {
        await signIn(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-heading">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-soft hover:text-heading"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-full border border-border bg-bg p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-full py-1.5 transition-colors ${
              mode === 'signin' ? 'bg-accent text-white' : 'text-text-soft'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-full py-1.5 transition-colors ${
              mode === 'signup' ? 'bg-accent text-white' : 'text-text-soft'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-text-soft">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-heading outline-none focus:border-accent"
              autoComplete="email"
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
              required
            />
            {mode === 'signup' && (
              <span className="mt-1 block text-[11px] font-normal text-text-soft">
                Must be a @{ALLOWED_EMAIL_DOMAIN} address
              </span>
            )}
          </label>

          {mode === 'signup' && (
            <label className="text-xs font-semibold text-text-soft">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-heading outline-none focus:border-accent"
                autoComplete="nickname"
                required
              />
            </label>
          )}

          <label className="text-xs font-semibold text-text-soft">
            Password
            <div className="relative mt-1">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 pr-9 text-sm text-heading outline-none focus:border-accent"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-2.5 text-text-soft hover:text-heading"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          <Button type="submit" disabled={submitting} className="mt-1 w-full justify-center">
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
