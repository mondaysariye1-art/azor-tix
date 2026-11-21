import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { TicketConfirmationView } from '@/components/TicketConfirmationView'
import { getPayloadClient } from '@/lib/payload'
import { resolveTicketForCustomerView } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

async function getRequestOrigin(): Promise<string | undefined> {
  const hdrs = await headers()
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
  if (!host) return undefined
  const proto = hdrs.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export default async function TicketPage({ params }: PageProps<'/tickets/[code]'>) {
  const { code } = await params
  const [payload, origin] = await Promise.all([getPayloadClient(), getRequestOrigin()])
  const ticket = await resolveTicketForCustomerView(payload, code, origin)
  if (!ticket) notFound()

  const variant =
    ticket.acquisitionType === 'gift'
      ? 'gift-recipient'
      : ticket.acquisitionType === 'private-invitation' || ticket.acquisitionType === 'complimentary'
        ? 'private-invitation'
        : 'standard'

  return (
    <TicketConfirmationView
      mode="single"
      variant={variant}
      buyerName={ticket.attendeeName}
      senderName={ticket.purchaserName || undefined}
      giftMessage={ticket.giftMessage || undefined}
      eventName={ticket.eventName}
      eventDate={ticket.eventDate}
      eventTime={ticket.eventTime}
      eventVenue={ticket.eventVenue}
      peopleCovered={ticket.peopleCovered}
      isFree={ticket.isFree}
      orderReference={ticket.orderReference}
      tickets={[ticket]}
    />
  )
}
