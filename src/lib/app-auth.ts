import 'server-only'
import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'

export const APP_SESSION_COOKIE = 'app-session'

export async function getCurrentAppUser() {
  const token = (await cookies()).get(APP_SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await getPayloadClient()
  const authHeaders = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers: authHeaders })
  if (!user || user.collection !== 'users') return null
  return user
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https'
  }
  const origin = request.headers.get('origin') || request.headers.get('referer')
  if (origin) {
    try {
      return new URL(origin).protocol === 'https:'
    } catch {
      // Ignore malformed origin or referer headers
    }
  }
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'))
  }
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7, secure?: boolean) {
  const isSecure = secure ?? Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'))
  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
    secure: isSecure,
  }
}
