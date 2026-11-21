import crypto from 'node:crypto'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'
import { finalizePaystackPayment } from '@/lib/payments'
import { getPaystackSecretKey } from '@/lib/paystack'

export async function POST(request: Request) {
  const secretKey = getPaystackSecretKey()
  if (!secretKey) return new Response('Not configured', { status: 503 })
  const rawBody = await request.text()
  const expected = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex')
  const supplied = (request.headers.get('x-paystack-signature') || '').trim()
  const valid =
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const event = JSON.parse(rawBody)
  if (event.event === 'charge.success') {
    await finalizePaystackPayment(event.data)
  } else if (
    event.event === 'transfer.success' ||
    event.event === 'transfer.failed' ||
    event.event === 'transfer.reversed'
  ) {
    const ref = String(event.data?.reference || '').trim()
    if (ref) {
      const payload = await getPayloadClient()
      const found = await payload.find({
        collection: 'payout-requests',
        overrideAccess: true,
        where: {
          or: [{ paystackTransferReference: { equals: ref } }, { reference: { equals: ref } }],
        },
        limit: 1,
        depth: 0,
      })
      const payout: any = found.docs[0]
      if (payout) {
        const nextStatus = event.event === 'transfer.success' ? 'paid' : 'failed'
        await payload.update({
          collection: 'payout-requests',
          overrideAccess: true,
          id: payout.id,
          data: {
            status: nextStatus,
            ...(nextStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
            ...(nextStatus === 'failed'
              ? {
                  failureReason:
                    String(event.data?.reason || event.data?.status || `Paystack ${event.event}`),
                }
              : {}),
            providerPayload: event.data,
          } as any,
        })
        await logAudit({
          payload,
          action: `payout.webhook_${nextStatus}`,
          category: 'payout',
          actor: { email: 'paystack-webhook@azortix.com', role: 'system' },
          targetCollection: 'payout-requests',
          targetId: payout.id,
          summary: `Paystack transfer webhook (${event.event}) updated payout ${payout.reference} to ${nextStatus}.`,
        })
      }
    }
  }
  return Response.json({ received: true })
}
