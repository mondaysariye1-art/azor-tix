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
    const appealId = String(form.get('appealId') || '').trim()
    const decision = form.get('decision') === 'approved' ? 'approved' : 'rejected'
    const reviewNote = String(form.get('reviewNote') || '').trim()
    const isOverride = form.get('override') === 'true' && user.role === 'super-admin'

    if (!appealId) {
      return Response.json({ error: 'Missing appeal ID.' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const appeal: any = await payload
      .findByID({
        collection: 'bank-change-appeals',
        id: appealId,
        overrideAccess: true,
        depth: 0,
      })
      .catch(() => null)
    if (!appeal) {
      return Response.json({ error: 'Bank change appeal not found.' }, { status: 404 })
    }

    if (appeal.status !== 'pending' && !isOverride) {
      return Response.json(
        { error: `This appeal has already been ${appeal.status}. Only Super Admin can override.` },
        { status: 409 },
      )
    }

    // Strict 3-day review restriction before approval
    if (decision === 'approved') {
      const eligibleMs = new Date(appeal.reviewEligibleAt).valueOf()
      if (Number.isFinite(eligibleMs) && Date.now() < eligibleMs) {
        return Response.json(
          {
            error: `Three-day review restriction active. This appeal cannot be approved before ${new Date(
              eligibleMs,
            ).toUTCString()}.`,
          },
          { status: 409 },
        )
      }
    }

    const organizerId =
      typeof appeal.organizer === 'object' ? appeal.organizer.id : appeal.organizer
    const nowIso = new Date().toISOString()

    if (decision === 'approved') {
      const bankRes = await payload.find({
        collection: 'bank-verifications',
        overrideAccess: true,
        where: { organizer: { equals: organizerId } },
        limit: 1,
        depth: 0,
      })
      const existingBank: any = bankRes.docs[0]
      if (existingBank) {
        await payload.update({
          collection: 'bank-verifications',
          id: existingBank.id,
          overrideAccess: true,
          data: {
            bankName: appeal.proposedBankName,
            bankCode: appeal.proposedBankCode,
            accountNumber: appeal.proposedAccountNumber,
            accountName: appeal.proposedAccountName,
            locked: true,
            status: 'verified',
            verifiedAt: nowIso,
            verificationProvider: appeal.verificationProvider || 'paystack',
          } as any,
        })
      }
    }

    const history = Array.isArray(appeal.auditHistory) ? [...appeal.auditHistory] : []
    history.push({
      action: isOverride
        ? `Super Admin override: ${decision}`
        : decision === 'approved'
          ? 'Appeal approved'
          : 'Appeal rejected',
      actorEmail: user.email,
      actorRole: user.role,
      note: reviewNote || undefined,
      at: nowIso,
    })

    const updated = await payload.update({
      collection: 'bank-change-appeals',
      id: appeal.id,
      overrideAccess: true,
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewedByRole: user.role,
        reviewedAt: nowIso,
        reviewNote: reviewNote || undefined,
        ...(isOverride ? { overriddenBy: user.id } : {}),
        auditHistory: history,
      } as any,
    })

    const organizerUser: any = await payload
      .findByID({
        collection: 'users',
        id: organizerId,
        overrideAccess: true,
        depth: 0,
      })
      .catch(() => null)

    let emailStatus: any = undefined
    if (organizerUser?.email) {
      emailStatus = await sendTransactionalEmail({
        payload,
        to: organizerUser.email,
        subject: `Bank Change Appeal ${decision === 'approved' ? 'Approved' : 'Rejected'} — AZORTIX`,
        title: `Your bank change appeal was ${decision}`,
        bodyHtml: `<p>An AZORTIX ${user.role} reviewed your bank account change request.</p><p><strong>Decision:</strong> ${decision.toUpperCase()}${
          reviewNote ? `<br/><strong>Note:</strong> ${reviewNote}` : ''
        }</p><p><strong>Active Settlement Account:</strong> ${
          decision === 'approved'
            ? `${appeal.proposedAccountName} (${appeal.proposedBankName} · ${appeal.proposedAccountNumber})`
            : `${appeal.currentAccountName} (${appeal.currentBankName} · ${appeal.currentAccountNumber})`
        }</p>`,
        text: `Your bank change appeal was ${decision}. ${reviewNote || ''}`,
      })
    }

    await logAudit({
      payload,
      action: isOverride ? `bank_appeal.override_${decision}` : `bank_appeal.${decision}`,
      category: 'appeal',
      actor: user as any,
      targetCollection: 'bank-change-appeals',
      targetId: updated.id,
      summary: `Bank appeal ${updated.id} ${decision} by ${user.role} (${user.email}).`,
    })

    return Response.json({
      appeal: updated,
      emailStatus,
      message:
        decision === 'approved'
          ? 'Bank change appeal approved and organizer settlement account updated.'
          : 'Bank change appeal rejected. Existing settlement account kept locked.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to review bank change appeal.' },
      { status: 400 },
    )
  }
}
