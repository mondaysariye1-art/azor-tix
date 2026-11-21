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
    const form = await request.formData()
    const id = String(form.get('bankId') || '').trim()
    const status = form.get('decision') === 'verified' ? 'verified' : 'rejected'
    const payload = await getPayloadClient()

    const updated: any = await payload.update({
      collection: 'bank-verifications',
      id,
      overrideAccess: false,
      user,
      data: {
        status,
        ...(status === 'verified' ? { verifiedAt: new Date().toISOString(), locked: true } : {}),
      } as any,
    })

    const organizerId =
      typeof updated.organizer === 'object' ? updated.organizer.id : updated.organizer
    const organizerUser: any = organizerId
      ? await payload
          .findByID({ collection: 'users', id: organizerId, overrideAccess: true, depth: 0 })
          .catch(() => null)
      : null
    if (organizerUser?.email) {
      await sendTransactionalEmail({
        payload,
        to: organizerUser.email,
        subject: `Settlement Bank Account ${status.toUpperCase()} — AZORTIX`,
        title: `Settlement bank account ${status}`,
        bodyHtml: `<p>Your settlement bank record (${updated.bankName} · ${updated.accountNumber}) was marked <strong>${status}</strong> by ${user.role}.</p>`,
        text: `Settlement bank account ${updated.bankName} (${updated.accountNumber}) marked ${status}.`,
      })
    }

    await logAudit({
      payload,
      action: `bank.review_${status}`,
      category: 'bank',
      actor: user as any,
      targetCollection: 'bank-verifications',
      targetId: updated.id,
      summary: `${user.role} set bank verification ${updated.id} (${updated.bankName} · ${updated.accountNumber}) to ${status}.`,
    })

    return Response.json({ message: `Bank details ${status}.` })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to review bank details.' },
      { status: 400 },
    )
  }
}
