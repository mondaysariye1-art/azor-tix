import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, isHttpsRequest, sessionCookieOptions } from '@/lib/app-auth'
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
    ;(await cookies()).set(
      APP_SESSION_COOKIE,
      result.token,
      sessionCookieOptions(undefined, isHttpsRequest(request)),
    )
    return Response.json({
      role: result.user.role,
      accountType: result.user.accountType || 'individual',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/locked/i.test(message)) {
      return Response.json(
        { error: 'Too many failed login attempts. Try again in 15 minutes.' },
        { status: 423 },
      )
    }
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
}
