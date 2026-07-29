import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/Button'

export function Signin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-6 py-20">
      <div className="w-full max-w-[420px] rounded-panel border border-border bg-surface p-9 shadow-[0_20px_40px_-24px_rgba(34,29,26,0.18)]">
        <h1 className="mb-1.5 font-display text-2xl font-bold text-text">Sign in</h1>
        <p className="mb-6 text-sm text-text-soft">Use your @zawadie.com work email.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block text-sm font-bold text-text">
            Work email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@zawadie.com"
              className="mt-1.5 w-full rounded-control border border-border-input bg-surface px-3.5 py-3 text-sm text-text outline-none"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-bold text-text">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-control border border-border-input bg-surface px-3.5 py-3 text-sm text-text outline-none"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? 'Please wait…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-soft">
          New here?{' '}
          <Link to="/signup" className="font-bold text-accent hover:text-accent-hover">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
