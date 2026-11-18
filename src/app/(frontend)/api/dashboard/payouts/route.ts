import crypto from 'node:crypto'
import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'super-admin') {
    return Response.json({ error: 'Only Super Admin can authorize payouts.' }, { status: 403 })
  }
  const form = await request.formData()
  const eventId = String(form.get('eventId') || '')
  const amount = Number(form.get('amount'))
  const payload = await getPayloadClient()
  const event = await payload.findByID({
    collection: 'events',
    overrideAccess: false,
    user,
    id: eventId,
    depth: 0,
  })
  const organizer = typeof event.organizer === 'object' ? event.organizer.id : event.organizer
  const orders = await payload.find({
    collection: 'orders',
    overrideAccess: false,
    user,
    where: { and: [{ event: { equals: event.id } }, { status: { equals: 'paid' } }] },
    limit: 1000,
    depth: 0,
  })
  const payouts = await payload.find({
    collection: 'payout-requests',
    overrideAccess: false,
    user,
    where: {
      and: [{ event: { equals: event.id } }, { status: { in: ['pending', 'approved', 'paid'] } }],
    },
    limit: 1000,
    depth: 0,
  })
  const earnings = orders.docs.reduce(
    (sum, order) => sum + Number(order.organizerEarnings ?? Number(order.subtotal) * 0.95),
    0,
  )
  const reserved = payouts.docs.reduce((sum, payout) => sum + Number(payout.amount), 0)
  if (!Number.isFinite(amount) || amount < 1000 || amount > earnings - reserved) {
    return Response.json({ error: 'Amount exceeds verified organizer earnings.' }, { status: 400 })
  }
  await payload.create({
    collection: 'payout-requests',
    overrideAccess: false,
    user,
    data: {
      reference: `PAY-${crypto.randomUUID()}`,
      organizer,
      event: event.id,
      amount,
      status: 'approved',
      reviewedBy: user.id,
    },
  })
  return Response.json({ message: 'Payout authorized by Super Admin.' })
}
