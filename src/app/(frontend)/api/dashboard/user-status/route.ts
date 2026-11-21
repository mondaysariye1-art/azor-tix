import { isProtectedAdminAccount } from '@/collections/Users'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const contentType = request.headers.get('content-type') || ''
    let userId = ''
    let status: 'active' | 'suspended' = 'suspended'
    let requestedRole = ''
    let requestedAction = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      userId = String(body.userId || '').trim()
      status = body.status === 'active' ? 'active' : 'suspended'
      requestedRole = typeof body.role === 'string' ? body.role.trim() : ''
      requestedAction = typeof body.action === 'string' ? body.action.trim() : ''
    } else {
      const form = await request.formData()
      userId = String(form.get('userId') || '').trim()
      status = form.get('status') === 'active' ? 'active' : 'suspended'
      requestedRole = form.has('role') ? String(form.get('role') || '').trim() : ''
      requestedAction = form.has('action') ? String(form.get('action') || '').trim() : ''
    }

    if (!userId) {
      return Response.json({ error: 'Missing user ID.' }, { status: 400 })
    }
    if (String(userId) === String(user.id)) {
      return Response.json({ error: 'You cannot suspend your own account.' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const target: any = await payload
      .findByID({
        collection: 'users',
        overrideAccess: false,
        user,
        id: userId,
        depth: 0,
      })
      .catch(() => null)
    if (!target) {
      return Response.json({ error: 'User account not found.' }, { status: 404 })
    }

    if (isProtectedAdminAccount(target) || target.role !== 'organizer') {
      await logAudit({
        payload,
        action: 'user.protected_admin_modification_blocked',
        category: 'admin',
        actor: user as any,
        targetCollection: 'users',
        targetId: target.id,
        summary: `Blocked ${user.role} (${user.email}) attempt to modify ${target.role} (${target.email}) status=${status} role=${requestedRole || target.role}.`,
      })
      return Response.json(
        {
          error:
            'Permanent administrator accounts (Admin and Super Admin) cannot be deleted, deactivated, suspended, disabled, or demoted.',
        },
        { status: 403 },
      )
    }

    if (requestedRole || requestedAction === 'delete' || requestedAction === 'demote') {
      return Response.json(
        { error: 'Role reassignment and account deletion are not permitted from status control.' },
        { status: 403 },
      )
    }

    await payload.update({
      collection: 'users',
      overrideAccess: true,
      id: userId,
      data: {
        accountStatus: status,
        ...(status === 'suspended'
          ? { tokenVersion: Number(target.tokenVersion ?? 0) + 1 }
          : {}),
      } as any,
    })

    if (target.email) {
      await sendTransactionalEmail({
        payload,
        to: target.email,
        subject: `AZORTIX Account ${status === 'active' ? 'Reactivated' : 'Suspended'}`,
        title: `Your account is now ${status}`,
        bodyHtml: `<p>Your AZORTIX account (${target.email}) status has been updated to <strong>${status}</strong> by ${user.role}.</p>`,
        text: `Your AZORTIX account status is now ${status}.`,
      })
    }

    await logAudit({
      payload,
      action: `user.status_${status}`,
      category: 'user',
      actor: user as any,
      targetCollection: 'users',
      targetId: target.id,
      summary: `${user.role} set account ${target.email} (${target.role}) status to ${status}.`,
    })

    return Response.json({ message: `Account ${status}.` })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update user status.' },
      { status: 400 },
    )
  }
}
