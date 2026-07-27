import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_lib/db.js'
import { verifyPassword, createSession, setSessionCookie } from '../_lib/auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const sql = getSql()

  const rows = await sql`
    SELECT id, email, display_name, password_hash, password_salt
    FROM users WHERE email = ${cleanEmail}
  `
  const user = rows[0]
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const progressRows = await sql`
    SELECT points, streak, last_active_date::text AS last_active_date, completed_exercises, quiz_passed, badges
    FROM progress WHERE user_id = ${user.id}
  `
  const progress = progressRows[0] ?? null

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res.status(200).json({
    user: { id: user.id, email: user.email, displayName: user.display_name },
    progress: progress && {
      points: progress.points,
      streak: progress.streak,
      lastActiveDate: progress.last_active_date,
      completedExercises: progress.completed_exercises,
      quizPassed: progress.quiz_passed,
      badges: progress.badges,
    },
  })
}
