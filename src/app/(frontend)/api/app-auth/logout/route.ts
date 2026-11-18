import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, sessionCookieOptions } from '@/lib/app-auth'

export async function POST() {
  ;(await cookies()).set(APP_SESSION_COOKIE, '', sessionCookieOptions(0))
  return Response.json({ ok: true })
}
