import crypto from 'node:crypto'
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
    let eventId = ''
    let amount = 0
    let reason = ''
    let idempotencyKey = ''
    let mode: 'initiate-transfer' | 'authorize-only' = 'initiate-transfer'

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      eventId = String(body.eventId || '').trim()
      amount = Number(body.amount)
      reason = String(body.reason || '').trim()
      idempotencyKey = String(body.idempotencyKey || '').trim()
      mode = body.mode === 'authorize-only' ? 'authorize-only' : 'initiate-transfer'
    } else {
      const form = await request.formData()
      eventId = String(form.get('eventId') || '').trim()
      amount = Number(form.get('amount'))
      reason = String(form.get('reason') || '').trim()
      idempotencyKey = String(form.get('idempotencyKey') || '').trim()
      mode = form.get('mode') === 'authorize-only' ? 'authorize-only' : 'initiate-transfer'
    }

    if (!eventId) {
      return Response.json({ error: 'Select an event for payout transfer.' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount < 1000) {
      return Response.json({ error: 'Transfer amount must be at least ₦1,000.' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const effectiveIdempotencyKey = idempotencyKey || `transfer-${crypto.randomUUID()}`

    const reservation = await withTransactionLocked(`payout:${eventId}`, async () => {
      if (idempotencyKey) {
        const existingDupe = await payload.find({
          collection: 'payout-requests',
          overrideAccess: true,
          where: { idempotencyKey: { equals: idempotencyKey } },
          limit: 1,
          depth: 0,
        })
        if (existingDupe.docs[0]) {
          return {
            ok: false as const,
            status: 409,
            error: 'Duplicate transfer request blocked (idempotency key already used).',
          }
        }
      }

      const event: any = await payload
        .findByID({
          collection: 'events',
          overrideAccess: true,
          id: eventId,
          draft: true,
          depth: 0,
        })
        .catch(() => null)
      if (!event) {
        return { ok: false as const, status: 404, error: 'Event not found.' }
      }

      const organizerId =
        typeof event.organizer === 'object' ? event.organizer.id : event.organizer

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
          error:
            'Organizer does not have a Paystack-verified and locked settlement bank account.',
        }
      }

      const [orders, payouts] = await Promise.all([
        payload.find({
          collection: 'orders',
          overrideAccess: true,
          where: { and: [{ event: { equals: event.id } }, { status: { equals: 'paid' } }] },
          limit: 1000,
          depth: 0,
        }),
        payload.find({
          collection: 'payout-requests',
          overrideAccess: true,
          where: {
            and: [
              { event: { equals: event.id } },
              { status: { in: ['pending', 'processing', 'approved', 'paid'] } },
            ],
          },
          limit: 1000,
          depth: 0,
        }),
      ])

      const earnings = orders.docs.reduce(
        (sum: number, order: any) =>
          sum + Number(order.organizerEarnings ?? Number(order.subtotal) * 0.95),
        0,
      )
      const reserved = payouts.docs.reduce(
        (sum: number, payout: any) => sum + Number(payout.amount || 0),
        0,
      )
      const availableBalance = Math.max(0, earnings - reserved)
      if (amount > availableBalance) {
        return {
          ok: false as const,
          status: 400,
          error: `Requested transfer (₦${amount.toLocaleString()}) exceeds verified available balance (₦${availableBalance.toLocaleString()}).`,
        }
      }

      const reference = `PAY-${crypto.randomUUID()}`
      const created: any = await payload.create({
        collection: 'payout-requests',
        overrideAccess: true,
        data: {
          reference,
          idempotencyKey: effectiveIdempotencyKey,
          organizer: organizerId,
          event: event.id,
          amount,
          status: mode === 'authorize-only' ? 'approved' : 'processing',
          initiatedBy: user.id,
          initiatedByRole: user.role,
          reviewedBy: user.id,
          reason: reason || `AZORTIX payout for ${event.title}`,
          bankName: bank.bankName,
          bankCode: bank.bankCode,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          paystackTransferReference: reference,
        } as any,
      })

      return {
        ok: true as const,
        created,
        event,
        organizerId,
        bank,
        reference,
        availableAfter: availableBalance - amount,
      }
    })

    if (!reservation.ok) {
      return Response.json({ error: reservation.error }, { status: reservation.status })
    }

    const { created, event, organizerId, bank, reference } = reservation

    if (mode === 'authorize-only') {
      await logAudit({
        payload,
        action: 'payout.authorized',
        category: 'payout',
        actor: user as any,
        targetCollection: 'payout-requests',
        targetId: created.id,
        summary: `${user.role} (${user.email}) authorized payout ${reference} of ₦${amount.toLocaleString()} for "${event.title}".`,
      })
      return Response.json({
        payoutId: created.id,
        reference,
        status: 'approved',
        message: `Payout ${reference} authorized (${user.role}).`,
      })
    }

    const recipientResult = await createPaystackTransferRecipient({
      name: bank.accountName,
      accountNumber: bank.accountNumber,
      bankCode: bank.bankCode,
    })

    if (!recipientResult.ok) {
      await payload.update({
        collection: 'payout-requests',
        overrideAccess: true,
        id: created.id,
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
        targetId: created.id,
        summary: `${user.role} Paystack transfer ${reference} failed at recipient creation: ${recipientResult.error}`,
      })
      return Response.json(
        { error: recipientResult.error, payoutId: created.id, reference, status: 'failed' },
        { status: recipientResult.status },
      )
    }

    const transferResult = await initiatePaystackTransfer({
      amountKobo: Math.round(amount * 100),
      recipientCode: recipientResult.recipientCode,
      reference,
      reason: reason || `AZORTIX payout for ${event.title}`,
    })

    if (!transferResult.ok) {
      await payload.update({
        collection: 'payout-requests',
        overrideAccess: true,
        id: created.id,
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
        targetId: created.id,
        summary: `${user.role} Paystack transfer ${reference} rejected: ${transferResult.error}`,
      })
      return Response.json(
        { error: transferResult.error, payoutId: created.id, reference, status: 'failed' },
        { status: transferResult.status },
      )
    }

    const finalStatus = transferResult.transferStatus === 'success' ? 'paid' : 'processing'
    const nowIso = new Date().toISOString()

    await payload.update({
      collection: 'payout-requests',
      overrideAccess: true,
      id: created.id,
      data: {
        status: finalStatus,
        paystackRecipientCode: recipientResult.recipientCode,
        paystackTransferCode: transferResult.transferCode,
        paystackTransferReference: transferResult.reference,
        providerPayload: transferResult.raw,
        ...(finalStatus === 'paid' ? { paidAt: nowIso } : {}),
      } as any,
    })

    const organizerUser: any = await payload
      .findByID({ collection: 'users', id: organizerId, overrideAccess: true, depth: 0 })
      .catch(() => null)
    if (organizerUser?.email) {
      await sendTransactionalEmail({
        payload,
        to: organizerUser.email,
        subject: `Transfer Initiated: ₦${amount.toLocaleString()} (${reference}) — AZORTIX`,
        title: 'Organizer transfer initiated',
        bodyHtml: `<p>A Paystack transfer of <strong>₦${amount.toLocaleString()}</strong> for <strong>${event.title}</strong> has been initiated to <strong>${bank.accountName}</strong> (${bank.bankName} · ${bank.accountNumber}).</p><p>Reference: <code>${reference}</code><br/>Transfer Code: <code>${transferResult.transferCode}</code></p>`,
        text: `Transfer of ₦${amount.toLocaleString()} initiated for ${event.title}. Ref: ${reference}.`,
      })
    }

    await logAudit({
      payload,
      action: 'payout.transfer_initiated',
      category: 'payout',
      actor: user as any,
      targetCollection: 'payout-requests',
      targetId: created.id,
      summary: `${user.role} (${user.email}) initiated Paystack transfer ${reference} (${transferResult.transferCode}) of ₦${amount.toLocaleString()} to ${bank.accountName} for "${event.title}" [${finalStatus}].`,
    })

    return Response.json({
      payoutId: created.id,
      reference: transferResult.reference,
      transferCode: transferResult.transferCode,
      recipientCode: recipientResult.recipientCode,
      status: finalStatus,
      message: `Paystack transfer initiated (${transferResult.transferCode}) — status: ${finalStatus}.`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to initiate payout transfer.' },
      { status: 400 },
    )
  }
}
