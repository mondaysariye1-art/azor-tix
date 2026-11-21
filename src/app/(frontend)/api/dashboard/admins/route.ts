import { isProtectedAdminAccount } from '@/collections/Users'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const actor = auth.user

  try {
    const contentType = request.headers.get('content-type') || ''
    let action = 'create'
    let userId = ''
    let name = ''
    let email = ''
    let password = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      action = String(body.action || 'create').trim()
      userId = String(body.userId || '').trim()
      name = String(body.name || '').trim()
      email = String(body.email || '').trim().toLowerCase()
      password = String(body.password || '')
    } else {
      const form = await request.formData()
      action = String(form.get('action') || 'create').trim()
      userId = String(form.get('userId') || '').trim()
      name = String(form.get('name') || '').trim()
      email = String(form.get('email') || '').trim().toLowerCase()
      password = String(form.get('password') || '')
    }

    const payload = await getPayloadClient()

    if (
      action === 'toggle-status' ||
      action === 'delete' ||
      action === 'demote' ||
      action === 'revoke' ||
      action === 'change-role'
    ) {
      if (!userId) {
        return Response.json({ error: 'Missing administrator user ID.' }, { status: 400 })
      }
      const target: any = await payload
        .findByID({
          collection: 'users',
          id: userId,
          overrideAccess: true,
          depth: 0,
        })
        .catch(() => null)
      if (!target) {
        return Response.json({ error: 'Administrator account not found.' }, { status: 404 })
      }
      if (isProtectedAdminAccount(target)) {
        await logAudit({
          payload,
          action: 'admin.protected_action_blocked',
          category: 'admin',
          actor: actor as any,
          targetCollection: 'users',
          targetId: target.id,
          summary: `Blocked attempt by ${actor.email} (${actor.role}) to perform "${action}" on permanent ${target.role} account ${target.email}.`,
        })
        return Response.json(
          {
            error:
              'Admin and Super Admin are permanent system-level roles. Neither role can delete, deactivate, suspend, disable, or demote the other.',
          },
          { status: 403 },
        )
      }
      return Response.json(
        { error: 'Only permanent administrator role protections apply to staff accounts.' },
        { status: 403 },
      )
    }

    if (name.length < 2 || !emailPattern.test(email) || password.length < 12) {
      return Response.json(
        { error: 'Provide admin name, valid email, and a temporary password (12+ characters).' },
        { status: 400 },
      )
    }

    const existing = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      return Response.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 },
      )
    }

    const created: any = await payload.create({
      collection: 'users',
      overrideAccess: true,
      disableVerificationEmail: true,
      showHiddenFields: true,
      data: {
        name,
        email,
        password,
        role: 'admin',
        accountType: 'individual',
        accountStatus: 'active',
        onboardingComplete: true,
        mustChangePassword: true,
        _verified: true,
      } as any,
    })

    const emailStatus = await sendTransactionalEmail({
      payload,
      to: email,
      subject: 'Your AZORTIX Admin Account is Ready',
      title: 'Administrator access granted',
      bodyHtml: `<p>Hello ${name},</p><p>A Super Admin has created your AZORTIX Admin account (<strong>${email}</strong>).</p><p>Sign in at <a href="https://azortix.com/login">azortix.com/login</a> using your temporary password. You will be asked to set a new password immediately on first login.</p>`,
      text: `Your AZORTIX Admin account (${email}) has been created. Sign in and change your password on first login.`,
    })

    await logAudit({
      payload,
      action: 'admin.created',
      category: 'admin',
      actor: actor as any,
      targetCollection: 'users',
      targetId: created.id,
      summary: `Super Admin created Admin account ${email}.`,
    })

    return Response.json({
      adminId: created.id,
      emailStatus,
      message: `Admin account created for ${email} (password change required on first login).`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to manage admin account.' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  const auth = await requireActiveDashboardUser(['admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId') || ''
  if (!userId) {
    return Response.json({ error: 'Missing user ID.' }, { status: 400 })
  }
  const payload = await getPayloadClient()
  const target: any = await payload
    .findByID({ collection: 'users', id: userId, overrideAccess: true, depth: 0 })
    .catch(() => null)
  if (target && isProtectedAdminAccount(target)) {
    return Response.json(
      {
        error:
          'Permanent administrator accounts (Admin and Super Admin) cannot be deleted or removed.',
      },
      { status: 403 },
    )
  }
  return Response.json(
    { error: 'Deleting administrator accounts is prohibited.' },
    { status: 403 },
  )
}
