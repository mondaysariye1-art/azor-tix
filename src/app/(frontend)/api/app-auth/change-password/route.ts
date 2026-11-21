import { cookies } from 'next/headers'
import {
  APP_SESSION_COOKIE,
  getCurrentAppUser,
  isHttpsRequest,
  sessionCookieOptions,
} from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    if (!user) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const body = await request.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json(
        { error: 'Enter your current password, new password, and confirmation.' },
        { status: 400 },
      )
    }
    if (newPassword.length < 12) {
      return Response.json(
        { error: 'New password must be at least 12 characters long.' },
        { status: 400 },
      )
    }
    if (newPassword !== confirmPassword) {
      return Response.json({ error: 'New passwords do not match.' }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return Response.json(
        { error: 'New password must be different from your current password.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    try {
      await payload.login({
        collection: 'users',
        overrideAccess: false,
        data: { email: user.email, password: currentPassword },
        depth: 0,
      })
    } catch {
      return Response.json({ error: 'Current password is incorrect.' }, { status: 401 })
    }

    const nextTokenVersion = Number((user as any).tokenVersion ?? 0) + 1
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: {
        password: newPassword,
        mustChangePassword: false,
        tokenVersion: nextTokenVersion,
      } as any,
    })

    const refreshed = await payload.login({
      collection: 'users',
      overrideAccess: false,
      data: { email: user.email, password: newPassword },
      depth: 0,
    })

    if (refreshed.token) {
      ;(await cookies()).set(
        APP_SESSION_COOKIE,
        refreshed.token,
        sessionCookieOptions(undefined, isHttpsRequest(request)),
      )
    }

    await logAudit({
      payload,
      action: 'user.password_changed',
      category: 'auth',
      actor: user as any,
      targetCollection: 'users',
      targetId: user.id,
      summary: `${user.email} changed password and invalidated prior sessions.`,
    })

    return Response.json({
      message: 'Password updated successfully. Redirecting to your dashboard…',
      role: user.role,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update password.' },
      { status: 400 },
    )
  }
}
