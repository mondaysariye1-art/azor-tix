import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { TicketConfirmationView } from '@/components/TicketConfirmationView'
import { getCurrentAppUser } from '@/lib/app-auth'
import { isEmailConfigured } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import {
  computeOrderPeopleCovered,
  formatEventDateTime,
  getTicketsForOrderDisplay,
  isFreeOrderOrTicket,
} from '@/lib/tickets'

export const dynamic = 'force-dynamic'

async function getRequestOrigin(): Promise<string | undefined> {
  const hdrs = await headers()
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
  if (!host) return undefined
  const proto = hdrs.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export default async function ConfirmationPage({
  params,
}: PageProps<'/confirmation/[reference]'>) {
  const { reference } = await params
  const [payload, currentUser, origin] = await Promise.all([
    getPayloadClient(),
    getCurrentAppUser(),
    getRequestOrigin(),
  ])
  const dashboardUrl = currentUser ? `/dashboard/${currentUser.role}` : null

  const orders = await payload.find({
    collection: 'orders',
    overrideAccess: true,
    where: { and: [{ reference: { equals: reference } }, { status: { equals: 'paid' } }] },
    limit: 1,
    depth: 1,
  })
  const order = orders.docs[0]
  if (!order) notFound()

  const tickets = await getTicketsForOrderDisplay(payload, order, origin)
  const event = typeof order.event === 'object' ? order.event : null
  const { eventName, eventDate, eventTime, eventVenue } = formatEventDateTime(event)
  const peopleCovered = computeOrderPeopleCovered(order, tickets.length)
  const isFree = isFreeOrderOrTicket(order, tickets[0])
  const emailConfigured = isEmailConfigured()
  const customerFullName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  const buyerName = customerFullName || tickets[0]?.attendeeName || 'Guest'

  const orderPurchaseMode = (order as any).purchaseMode
  const isMixedOrder = orderPurchaseMode === 'mixed'
  const isGiftOrder = orderPurchaseMode === 'gift'
  const isPrivateInvite =
    order.orderKind === 'complimentary' ||
    tickets[0]?.acquisitionType === 'private-invitation' ||
    tickets[0]?.source === 'free-claim'
  const variant = isMixedOrder
    ? 'mixed'
    : isGiftOrder
      ? 'gift-purchaser'
      : isPrivateInvite
        ? 'private-invitation'
        : 'standard'

  const giftCount = tickets.filter((t) => t.acquisitionType === 'gift').length
  const selfCount = tickets.length - giftCount

  const emailNotice = emailConfigured
    ? isMixedOrder
      ? `Your ${selfCount} personal ${selfCount === 1 ? 'ticket' : 'tickets'} and unified order receipt were emailed to ${order.customer?.email || 'your email address'}, and ${giftCount} individual gift ${giftCount === 1 ? 'ticket was' : 'tickets were'} emailed directly to ${giftCount === 1 ? 'your recipient' : 'your recipients'}.`
      : isGiftOrder
        ? `Individual gift ticket emails have been dispatched to your ${tickets.length === 1 ? 'recipient' : 'recipients'}, and a purchase confirmation was sent to ${order.customer?.email || 'your email address'}.`
        : `A copy of your ticket confirmation has been sent to ${order.customer?.email || 'your email address'}.`
    : 'Save or download your PDF passes below to present at the event entrance.'

  return (
    <TicketConfirmationView
      mode="confirmation"
      variant={variant}
      buyerName={buyerName}
      eventName={eventName}
      eventDate={eventDate}
      eventTime={eventTime}
      eventVenue={eventVenue}
      peopleCovered={peopleCovered}
      isFree={isFree}
      orderReference={String(order.reference)}
      tickets={tickets}
      emailNotice={emailNotice}
      footerActions={
        <div className="success-actions">
          <Link className="ticket-btn ticket-btn-primary" href="/discover">
            Discover more events
          </Link>
          <BackToDashboardButton
            dashboardUrl={dashboardUrl}
            className="ticket-btn ticket-btn-outline"
          />
        </div>
      }
    />
  )
}
