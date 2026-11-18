import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'

export default async function TicketPage({ params }: PageProps<'/tickets/[code]'>) {
  const { code } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tickets',
    overrideAccess: true,
    where: { code: { equals: code } },
    limit: 1,
    depth: 2,
  })
  const ticket = result.docs[0]
  if (!ticket) notFound()
  const event = typeof ticket.event === 'object' ? ticket.event : null
  const ticketType = typeof ticket.ticketType === 'object' ? ticket.ticketType : null
  return (
    <main className="digital-ticket-page">
      <section className="digital-ticket">
        <span className="eyebrow">AZOR TIX · Abuja</span>
        <h1>{event?.title || 'Event ticket'}</h1>
        <p>{ticket.attendeeName}</p>
        <p>{ticketType?.name}</p>
        <Image
          src={`/api/tickets/${ticket.code}/qr`}
          alt={`QR ticket for ${ticket.attendeeName}`}
          width={280}
          height={280}
        />
        <strong className={`ticket-status status-${ticket.status}`}>{ticket.status}</strong>
        <small>{ticket.code}</small>
      </section>
    </main>
  )
}
