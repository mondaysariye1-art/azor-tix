import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'

export default async function ConfirmationPage({ params }: PageProps<'/confirmation/[reference]'>) {
  const { reference } = await params
  const payload = await getPayloadClient()
  const orders = await payload.find({
    collection: 'orders',
    overrideAccess: true,
    where: { and: [{ reference: { equals: reference } }, { status: { equals: 'paid' } }] },
    limit: 1,
    depth: 1,
  })
  const order = orders.docs[0]
  if (!order) notFound()
  const tickets = await payload.find({
    collection: 'tickets',
    overrideAccess: true,
    where: { order: { equals: order.id } },
    limit: 100,
    depth: 0,
  })
  const event = typeof order.event === 'object' ? order.event : null
  return (
    <main className="success shell">
      <div className="success-icon">✓</div>
      <span className="eyebrow">You’re officially in</span>
      <h1>
        Payment <em>confirmed.</em>
      </h1>
      <p>
        Your order {order.reference} is paid. Ticket links were emailed to {order.customer.email};
        you can also open them below.
      </p>
      <div className="ticket-link-list">
        {tickets.docs.map((ticket, index) => (
          <Link key={ticket.id} href={`/tickets/${ticket.code}`}>
            Open ticket {index + 1}
            {event ? ` — ${event.title}` : ''}
          </Link>
        ))}
      </div>
      <Link className="button button-dark" href="/discover">
        Discover more events
      </Link>
    </main>
  )
}
