import crypto from 'node:crypto'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { refundPaystackTransaction } from '@/lib/paystack'
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
    let orderId = ''
    let reason = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      orderId = String(body.orderId || '').trim()
      reason = String(body.reason || '').trim()
    } else {
      const form = await request.formData()
      orderId = String(form.get('orderId') || '').trim()
      reason = String(form.get('reason') || '').trim()
    }

    if (!orderId || reason.length < 5) {
      return Response.json(
        { error: 'Select a paid order and provide a refund reason (at least 5 characters).' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()

    const prep = await withTransactionLocked(`refund:${orderId}`, async () => {
      const order: any = await payload
        .findByID({
          collection: 'orders',
          id: orderId,
          overrideAccess: true,
          depth: 1,
        })
        .catch(() => null)
      if (!order) {
        return { ok: false as const, status: 404, error: 'Order not found.' }
      }
      if (order.status === 'refunded') {
        return { ok: false as const, status: 409, error: 'This order has already been refunded.' }
      }
      if (order.status !== 'paid') {
        return {
          ok: false as const,
          status: 409,
          error: `Only paid orders can be refunded (current status: ${order.status}).`,
        }
      }

      const eventId = typeof order.event === 'object' ? order.event.id : order.event
      const isFreeOrder = order.orderKind === 'free' || Number(order.total || 0) === 0
      const refundRef = `RFD-${crypto.randomUUID()}`

      const refundDoc: any = await payload.create({
        collection: 'refunds',
        overrideAccess: true,
        data: {
          reference: refundRef,
          order: order.id,
          event: eventId,
          amount: Number(order.total || 0),
          reason,
          status: 'pending',
          initiatedBy: user.id,
        } as any,
      })

      return {
        ok: true as const,
        order,
        eventId,
        isFreeOrder,
        refundDoc,
        refundRef,
      }
    })

    if (!prep.ok) {
      return Response.json({ error: prep.error }, { status: prep.status })
    }

    const { order, eventId, isFreeOrder, refundDoc, refundRef } = prep

    let paystackRefundId = ''
    let paystackStatus = 'processed'

    if (!isFreeOrder && Number(order.total || 0) > 0) {
      const psRefund = await refundPaystackTransaction({
        reference: order.reference,
        amountKobo: Math.round(Number(order.total) * 100),
        merchantNote: reason,
      })

      if (!psRefund.ok) {
        await payload.update({
          collection: 'refunds',
          overrideAccess: true,
          id: refundDoc.id,
          data: {
            status: 'failed',
            failureReason: psRefund.error,
          } as any,
        })
        await logAudit({
          payload,
          action: 'refund.failed',
          category: 'refund',
          actor: user as any,
          targetCollection: 'orders',
          targetId: order.id,
          summary: `Refund ${refundRef} for order ${order.reference} failed via Paystack: ${psRefund.error}`,
        })
        return Response.json(
          { error: psRefund.error, refundId: refundDoc.id, status: 'failed' },
          { status: psRefund.status },
        )
      }

      paystackRefundId = psRefund.refundId
      paystackStatus = psRefund.refundStatus || 'processed'
    }

    const nowIso = new Date().toISOString()

    await payload.update({
      collection: 'refunds',
      overrideAccess: true,
      id: refundDoc.id,
      data: {
        status: 'processed',
        paystackRefundId: paystackRefundId || undefined,
        paystackStatus,
        processedAt: nowIso,
      } as any,
    })

    await payload.update({
      collection: 'orders',
      overrideAccess: true,
      id: order.id,
      data: { status: 'refunded' },
    })

    const txRes = await payload.find({
      collection: 'transactions',
      overrideAccess: true,
      where: { providerReference: { equals: order.reference } },
      limit: 5,
      depth: 0,
    })
    for (const tx of txRes.docs) {
      await payload.update({
        collection: 'transactions',
        overrideAccess: true,
        id: tx.id,
        data: { status: 'refunded' },
      })
    }

    const ticketsRes = await payload.find({
      collection: 'tickets',
      overrideAccess: true,
      where: { order: { equals: order.id } },
      limit: 100,
      depth: 0,
    })
    for (const ticket of ticketsRes.docs) {
      await payload.update({
        collection: 'tickets',
        overrideAccess: true,
        id: ticket.id,
        data: { status: 'refunded' },
      })
    }

    if (order.customer?.email) {
      await sendTransactionalEmail({
        payload,
        to: order.customer.email,
        subject: `Order Refunded (${order.reference}) — AZORTIX`,
        title: 'Your AZORTIX order has been refunded',
        bodyHtml: `<p>Hello ${order.customer.firstName || 'there'},</p><p>Order <strong>${order.reference}</strong> (₦${Number(order.total || 0).toLocaleString()}) has been refunded and its associated ticket passes are now void.</p><p>Reason: ${reason}</p>`,
        text: `Order ${order.reference} has been refunded. Associated tickets are now invalid for entry.`,
      })
    }

    await logAudit({
      payload,
      action: 'refund.processed',
      category: 'refund',
      actor: user as any,
      targetCollection: 'orders',
      targetId: order.id,
      summary: `${user.role} (${user.email}) refunded order ${order.reference} (₦${Number(order.total || 0).toLocaleString()}, ${ticketsRes.docs.length} ticket(s) invalidated) for event ${eventId}.`,
    })

    return Response.json({
      refundId: refundDoc.id,
      reference: refundRef,
      paystackRefundId,
      ticketsInvalidated: ticketsRes.docs.length,
      message: `Order ${order.reference} refunded and ${ticketsRes.docs.length} ticket(s) invalidated.`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to process refund.' },
      { status: 400 },
    )
  }
}
