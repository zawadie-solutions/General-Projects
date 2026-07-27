import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'
import {
  hashPassword,
  createSession,
  setSessionCookie,
  isAllowedEmail,
  ALLOWED_EMAIL_DOMAIN,
} from '../_lib/auth.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, displayName, password } = req.body ?? {}
  if (
    typeof email !== 'string' ||
    typeof displayName !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanDisplayName = displayName.trim()

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address' })
  }
  if (!isAllowedEmail(cleanEmail)) {
    return res
      .status(403)
      .json({ error: `Sign up requires a @${ALLOWED_EMAIL_DOMAIN} email address` })
  }
  if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40) {
    return res.status(400).json({ error: 'Display name must be 1-40 characters' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const sql = getSql()
  const existing = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }

  const { hash, salt } = hashPassword(password)
  const [user] = await sql`
    INSERT INTO users (email, display_name, password_hash, password_salt)
    VALUES (${cleanEmail}, ${cleanDisplayName}, ${hash}, ${salt})
    RETURNING id, email, display_name
  `
  await sql`INSERT INTO progress (user_id) VALUES (${user.id})`

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.display_name },
  })
}
