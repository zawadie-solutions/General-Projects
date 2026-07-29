import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Button } from '../components/Button'

const ALLOWED_EMAIL_DOMAIN = 'zawadie.com'

function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

export function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!isAllowedEmail(email)) {
      setError(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed for this course.`)
      return
    }
    setSubmitting(true)
    try {
      await signUp(email, name, password)
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
        <h1 className="mb-1.5 font-display text-2xl font-bold text-text">Create your account</h1>
        <p className="mb-6 text-sm text-text-soft">
          Zawadie PromptClass is only open to Zawadie Solutions agents.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block text-sm font-bold text-text">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amara Otieno"
              className="mt-1.5 w-full rounded-control border border-border-input bg-surface px-3.5 py-3 text-sm text-text outline-none"
              autoComplete="name"
            />
          </label>
          <label className="block text-sm font-bold text-text">
            Work email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
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
              placeholder="At least 6 characters"
              className="mt-1.5 w-full rounded-control border border-border-input bg-surface px-3.5 py-3 text-sm text-text outline-none"
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? 'Please wait…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-soft">
          Already have an account?{' '}
          <Link to="/signin" className="font-bold text-accent hover:text-accent-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
