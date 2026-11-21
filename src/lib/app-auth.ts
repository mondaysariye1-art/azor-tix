import 'server-only'
import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'

export const APP_SESSION_COOKIE = 'app-session'

function decodeJwtTokenVersion(token: string): number {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return 0
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      tokenVersion?: unknown
    }
    const ver = Number(decoded?.tokenVersion ?? 0)
    return Number.isFinite(ver) ? ver : 0
  } catch {
    return 0
  }
}

export async function getCurrentAppUser() {
  const token = (await cookies()).get(APP_SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await getPayloadClient()
  const authHeaders = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers: authHeaders })
  if (!user || user.collection !== 'users') return null

  const tokenVer = decodeJwtTokenVersion(token)
  const dbVer = Number((user as any).tokenVersion ?? 0)
  if (tokenVer !== dbVer) {
    return null
  }

  return user
}

export const DASHBOARD_ROLES = ['organizer', 'admin', 'super-admin'] as const
export type DashboardRole = (typeof DASHBOARD_ROLES)[number]

export function isDashboardRole(role: unknown): role is DashboardRole {
  return typeof role === 'string' && (DASHBOARD_ROLES as readonly string[]).includes(role)
}

export function getDashboardPathForRole(role: DashboardRole): string {
  return `/dashboard/${role}`
}

export async function getPublicNavigationUser() {
  const user = await getCurrentAppUser().catch(() => null)
  if (!user || user.accountStatus === 'suspended' || !isDashboardRole(user.role)) {
    return null
  }
  const dashboardUrl = user.mustChangePassword
    ? '/change-password'
    : getDashboardPathForRole(user.role)
  return {
    role: user.role as DashboardRole,
    dashboardUrl,
  }
}

export async function requireActiveDashboardUser(allowedRoles?: Array<DashboardRole>) {
  const user = await getCurrentAppUser()
  if (!user) {
    return { ok: false as const, status: 401, error: 'Authentication required.' }
  }
  if (!isDashboardRole(user.role)) {
    return { ok: false as const, status: 403, error: 'Dashboard access is not permitted for this account.' }
  }
  if (user.accountStatus === 'suspended') {
    return { ok: false as const, status: 403, error: 'This account is suspended.' }
  }
  if (user.mustChangePassword) {
    return {
      ok: false as const,
      status: 403,
      requirePasswordChange: true,
      error: 'You must change your initial password before accessing dashboard actions.',
    }
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false as const, status: 403, error: 'You do not have permission for this action.' }
  }
  return { ok: true as const, user }
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto?.split(',').some((proto) => proto.trim().toLowerCase() === 'https')) {
    return true
  }
  const origin = request.headers.get('origin') || request.headers.get('referer')
  if (origin) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.protocol === 'https:') return true
      if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        return false
      }
    } catch {
      // Ignore malformed origin or referer headers
    }
  }
  const forwardedHost =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  if (forwardedHost.includes('.run.app')) {
    return true
  }
  try {
    const reqUrl = new URL(request.url)
    if (reqUrl.protocol === 'https:') return true
    if (reqUrl.hostname === 'localhost' || reqUrl.hostname === '127.0.0.1') {
      return false
    }
  } catch {
    // Ignore malformed request URL
  }
  return Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'))
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7, secure?: boolean) {
  const isSecure = secure ?? Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'))
  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
    secure: isSecure,
    ...(isSecure ? { partitioned: true } : {}),
  }
}
