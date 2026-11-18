import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

export async function GET(request: Request) {
  const user = await getCurrentAppUser()
  if (!user) return new Response('Authentication required.', { status: 401 })
  const eventId = new URL(request.url).searchParams.get('event')
  const payload = await getPayloadClient()
  const where: any = eventId
    ? { event: { equals: eventId } }
    : user.role === 'organizer'
      ? { 'event.organizer': { equals: user.id } }
      : {}
  const orders = await payload.find({
    collection: 'orders',
    overrideAccess: false,
    user,
    where,
    limit: 1000,
    depth: 1,
    sort: '-createdAt',
  })
  const rows = [
    [
      'Reference',
      'Event',
      'Customer',
      'Email',
      'Subtotal',
      'Service fee',
      'Commission',
      'Organizer earnings',
      'Total',
      'Status',
      'Created',
    ],
    ...orders.docs.map((order: any) => [
      order.reference,
      typeof order.event === 'object' ? order.event.title : order.event,
      `${order.customer.firstName} ${order.customer.lastName}`,
      order.customer.email,
      order.subtotal,
      order.serviceFeeAmount ?? order.fees,
      order.commissionAmount ?? Math.round(Number(order.subtotal) * 0.05),
      order.organizerEarnings ?? Math.round(Number(order.subtotal) * 0.95),
      order.total,
      order.status,
      order.createdAt,
    ]),
  ]
  return new Response(rows.map((row) => row.map(csvCell).join(',')).join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="azor-tix-sales.csv"',
    },
  })
}
