import { isEmailConfigured, missingEmailEnvVars } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) {
      return Response.json({ error: 'Enter your email address.' }, { status: 400 })
    }

    if (!isEmailConfigured()) {
      const missing = missingEmailEnvVars().join(', ')
      return Response.json(
        {
          error: `Password reset email cannot be delivered because ${missing} is not configured on the server.`,
          sent: false,
          configured: false,
        },
        { status: 503 },
      )
    }

    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs[0]) {
      await payload.forgotPassword({
        collection: 'users',
        data: { email },
        disableEmail: false,
      })
      await logAudit({
        payload,
        action: 'user.forgot_password',
        category: 'auth',
        actor: existing.docs[0] as any,
        targetCollection: 'users',
        targetId: existing.docs[0].id,
        summary: `Password reset email requested for ${email}.`,
      })
    }

    return Response.json({
      sent: true,
      configured: true,
      message: 'If an account matches that email, a password reset link has been sent.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to send password reset email.' },
      { status: 500 },
    )
  }
}
