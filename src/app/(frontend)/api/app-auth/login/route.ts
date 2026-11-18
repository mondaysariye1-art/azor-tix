import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, sessionCookieOptions } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password)
      return Response.json({ error: 'Email and password are required.' }, { status: 400 })
    const payload = await getPayloadClient()
    const result = await payload.login({
      collection: 'users',
      overrideAccess: false,
      data: { email, password },
      depth: 0,
    })
    if (!result.token || !result.user || result.user.accountStatus === 'suspended') {
      return Response.json({ error: 'This account cannot sign in.' }, { status: 403 })
    }
    ;(await cookies()).set(APP_SESSION_COOKIE, result.token, sessionCookieOptions())
    return Response.json({ role: result.user.role })
  } catch {
    return Response.json({ error: 'Invalid credentials or locked account.' }, { status: 401 })
  }
}
