import { cookies } from 'next/headers'
import { APP_SESSION_COOKIE, isHttpsRequest, sessionCookieOptions } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'
import { checkRateLimit, extractClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = extractClientIp(request)
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const ipLimit = checkRateLimit(`login:ip:${ip}`, { maxRequests: 25, windowMs: 15 * 60 * 1000 })
    const emailLimit = checkRateLimit(`login:email:${email}`, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)
      return Response.json(
        {
          error: `Too many login attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      )
    }

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
    const { logAudit } = await import('@/lib/audit')
    await logAudit({
      payload,
      action: 'user.login',
      category: 'auth',
      actor: result.user as any,
      targetCollection: 'users',
      targetId: result.user.id,
      summary: `${result.user.email} signed in (${result.user.role}).`,
    })
    return Response.json({
      role: result.user.role,
      accountType: result.user.accountType || 'individual',
      mustChangePassword: Boolean(result.user.mustChangePassword),
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
