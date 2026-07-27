import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from './db'

const SESSION_COOKIE = 'pe_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export const ALLOWED_EMAIL_DOMAIN = 'zawadie.com'

export function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = scryptSync(password, salt, 64)
  const stored = Buffer.from(hash, 'hex')
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}

function parseCookies(header?: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : ''
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly;${secure} Path=/; Max-Age=${maxAge}; SameSite=Lax`,
  )
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
}

export async function createSession(userId: number) {
  const sql = getSql()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})`
  return token
}

export async function destroySession(req: VercelRequest) {
  const token = parseCookies(req.headers.cookie).pe_session
  if (!token) return
  const sql = getSql()
  await sql`DELETE FROM sessions WHERE token = ${token}`
}

export interface SessionUser {
  id: number
  email: string
  display_name: string
}

export async function getUserFromRequest(req: VercelRequest): Promise<SessionUser | null> {
  const token = parseCookies(req.headers.cookie).pe_session
  if (!token) return null
  const sql = getSql()
  const rows = (await sql`
    SELECT u.id, u.email, u.display_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()
  `) as SessionUser[]
  return rows[0] ?? null
}
