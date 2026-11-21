import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import {
  createPaystackTransferRecipient,
  initiatePaystackTransfer,
} from '@/lib/paystack'
import { withTransactionLocked } from '@/lib/postgres'

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
    let id = ''
    let decision = ''
    let reviewNote = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      id = String(body.payoutId || '').trim()
      decision = String(body.decision || '').trim()
      reviewNote = String(body.reviewNote || '').trim()
    } else {
      const form = await request.formData()
      id = String(form.get('payoutId') || '').trim()
      decision = String(form.get('decision') || '').trim()
      reviewNote = String(form.get('reviewNote') || '').trim()
    }

    if (!id) {
      return Response.json({ error: 'Missing payout request ID.' }, { status: 400 })
    }

    const payload = await getPayloadClient()

    const result = await withTransactionLocked(`payout-review:${id}`, async () => {
      const existing: any = await payload
        .findByID({
          collection: 'payout-requests',
          id,
          overrideAccess: true,
          depth: 0,
        })
        .catch(() => null)
      if (!existing) {
        return { ok: false as const, status: 404, error: 'Payout request not found.' }
      }
      if (!['pending', 'approved'].includes(existing.status)) {
        return {
          ok: false as const,
          status: 409,
          error: `Payout ${existing.reference} is already ${existing.status}.`,
        }
      }

      if (decision === 'rejected') {
        const updated = await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id,
          data: {
            status: 'rejected',
            reviewedBy: user.id,
            reviewNote: reviewNote || undefined,
          } as any,
        })
        return { ok: true as const, action: 'rejected' as const, payout: updated }
      }

      if (decision === 'approved') {
        const updated = await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id,
          data: {
            status: 'approved',
            reviewedBy: user.id,
            reviewNote: reviewNote || undefined,
          } as any,
        })
        return { ok: true as const, action: 'approved' as const, payout: updated }
      }

      if (decision === 'initiate-transfer' || decision === 'paid') {
        const organizerId =
          typeof existing.organizer === 'object' ? existing.organizer.id : existing.organizer
        const bankRes = await payload.find({
          collection: 'bank-verifications',
          overrideAccess: true,
          where: { organizer: { equals: organizerId } },
          limit: 1,
          depth: 0,
        })
        const bank: any = bankRes.docs[0]
        if (!bank || bank.status !== 'verified' || !bank.locked) {
          return {
            ok: false as const,
            status: 409,
            error: 'Organizer bank account is not verified and locked.',
          }
        }
        await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id,
          data: {
            status: 'processing',
            initiatedBy: user.id,
            initiatedByRole: user.role,
            reviewedBy: user.id,
            bankName: bank.bankName,
            bankCode: bank.bankCode,
            accountNumber: bank.accountNumber,
            accountName: bank.accountName,
          } as any,
        })
        return { ok: true as const, action: 'transfer' as const, payout: existing, bank }
      }

      return { ok: false as const, status: 400, error: 'Unsupported payout review decision.' }
    })

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status })
    }

    if (result.action === 'transfer') {
      const { payout, bank } = result
      const recipientResult = await createPaystackTransferRecipient({
        name: bank.accountName,
        accountNumber: bank.accountNumber,
        bankCode: bank.bankCode,
      })
      if (!recipientResult.ok) {
        await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id,
          data: {
            status: 'failed',
            failureReason: recipientResult.error,
            providerPayload: recipientResult.raw || null,
          } as any,
        })
        await logAudit({
          payload,
          action: 'payout.transfer_failed',
          category: 'payout',
          actor: user as any,
          targetCollection: 'payout-requests',
          targetId: id,
          summary: `${user.role} failed to create Paystack recipient for ${payout.reference}: ${recipientResult.error}`,
        })
        return Response.json({ error: recipientResult.error }, { status: recipientResult.status })
      }

      const transferResult = await initiatePaystackTransfer({
        amountKobo: Math.round(Number(payout.amount) * 100),
        recipientCode: recipientResult.recipientCode,
        reference: payout.reference,
        reason: payout.reason || `AZORTIX payout ${payout.reference}`,
      })
      if (!transferResult.ok) {
        await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id,
          data: {
            status: 'failed',
            paystackRecipientCode: recipientResult.recipientCode,
            failureReason: transferResult.error,
            providerPayload: transferResult.raw || null,
          } as any,
        })
        await logAudit({
          payload,
          action: 'payout.transfer_failed',
          category: 'payout',
          actor: user as any,
          targetCollection: 'payout-requests',
          targetId: id,
          summary: `${user.role} failed Paystack transfer ${payout.reference}: ${transferResult.error}`,
        })
        return Response.json({ error: transferResult.error }, { status: transferResult.status })
      }

      const finalStatus = transferResult.transferStatus === 'success' ? 'paid' : 'processing'
      await payload.update({
        collection: 'payout-requests',
        overrideAccess: true,
        id,
        data: {
          status: finalStatus,
          paystackRecipientCode: recipientResult.recipientCode,
          paystackTransferCode: transferResult.transferCode,
          paystackTransferReference: transferResult.reference,
          providerPayload: transferResult.raw,
          ...(finalStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
        } as any,
      })

      await logAudit({
        payload,
        action: 'payout.transfer_initiated',
        category: 'payout',
        actor: user as any,
        targetCollection: 'payout-requests',
        targetId: id,
        summary: `${user.role} initiated Paystack transfer for ${payout.reference} (${transferResult.transferCode}) [${finalStatus}].`,
      })

      return Response.json({
        message: `Paystack transfer initiated (${transferResult.transferCode}) — ${finalStatus}.`,
        status: finalStatus,
        transferCode: transferResult.transferCode,
      })
    }

    const updated: any = result.payout
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
        subject: `Payout ${result.action.toUpperCase()}: ${updated.reference} — AZORTIX`,
        title: `Payout update: ${result.action}`,
        bodyHtml: `<p>Payout <strong>${updated.reference}</strong> (₦${Number(updated.amount || 0).toLocaleString()}) is now <strong>${result.action}</strong>.</p>`,
        text: `Payout ${updated.reference} status updated to ${result.action}.`,
      })
    }

    await logAudit({
      payload,
      action: `payout.${result.action}`,
      category: 'payout',
      actor: user as any,
      targetCollection: 'payout-requests',
      targetId: updated.id,
      summary: `${user.role} marked payout ${updated.reference} as ${result.action}.`,
    })

    return Response.json({ message: `Payout request ${result.action}.` })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update payout.' },
      { status: 400 },
    )
  }
}
