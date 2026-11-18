import 'server-only'
import crypto from 'node:crypto'
import { getPayloadClient } from '@/lib/payload'

export async function finalizePaystackPayment(data: Record<string, any>) {
  const reference = String(data.reference || '')
  const payload = await getPayloadClient()
  const transactionResult = await payload.find({
    collection: 'transactions',
    overrideAccess: true,
    where: { providerReference: { equals: reference } },
    limit: 1,
    depth: 1,
  })
  const transaction = transactionResult.docs[0]
  if (!transaction) throw new Error('Transaction not found.')

  const orderID = typeof transaction.order === 'object' ? transaction.order.id : transaction.order
  const order = await payload.findByID({
    collection: 'orders',
    overrideAccess: true,
    id: orderID,
    depth: 2,
  })
  if (order.status === 'paid') return order
  if (
    data.status !== 'success' ||
    data.currency !== 'NGN' ||
    Number(data.amount) !== Math.round(Number(transaction.amount) * 100)
  ) {
    throw new Error('Paystack verification did not match the order.')
  }

  for (const item of order.items || []) {
    const ticketTypeID = typeof item.ticketType === 'object' ? item.ticketType.id : item.ticketType
    for (let index = 0; index < item.quantity; index += 1) {
      const issuanceKey = `${order.id}:${ticketTypeID}:${index}`
      const existing = await payload.find({
        collection: 'tickets',
        overrideAccess: true,
        where: { issuanceKey: { equals: issuanceKey } },
        limit: 1,
        depth: 0,
      })
      const code = existing.docs[0]?.code || crypto.randomUUID()
      if (!existing.docs[0]) {
        await payload.create({
          collection: 'tickets',
          overrideAccess: true,
          data: {
            code,
            issuanceKey,
            order: order.id,
            event: typeof order.event === 'object' ? order.event.id : order.event,
            ticketType: ticketTypeID,
            attendeeName: `${order.customer.firstName} ${order.customer.lastName}`,
            attendeeEmail: order.customer.email,
            attendeePhone: order.customer.phone,
            source: 'purchase',
            status: 'valid',
          } as any,
        })
      }
    }
  }

  const paidAt = new Date().toISOString()
  const updated = await payload.update({
    collection: 'orders',
    overrideAccess: true,
    id: order.id,
    data: { status: 'paid', paidAt },
  })
  await payload.update({
    collection: 'transactions',
    overrideAccess: true,
    id: transaction.id,
    data: { status: 'success', verifiedAt: paidAt },
  })
  if (order.discountCode) {
    const discounts = await payload.find({
      collection: 'discounts',
      overrideAccess: true,
      where: {
        and: [
          { event: { equals: typeof order.event === 'object' ? order.event.id : order.event } },
          { code: { equals: order.discountCode } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    const discount = discounts.docs[0]
    if (discount) {
      await payload.update({
        collection: 'discounts',
        overrideAccess: true,
        id: discount.id,
        data: { usedCount: Number(discount.usedCount || 0) + 1 },
      })
    }
  }

  return updated
}
