import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, isHttpsRequest, sessionCookieOptions } from '@/lib/app-auth'

export async function POST(request: Request) {
  ;(await cookies()).set(APP_SESSION_COOKIE, '', sessionCookieOptions(0, isHttpsRequest(request)))
  return Response.json({ ok: true })
}
