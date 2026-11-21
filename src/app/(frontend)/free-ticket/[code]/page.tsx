import { notFound } from 'next/navigation'
import FreeTicketClaim from '@/components/FreeTicketClaim'
import { formatReadableDateTime } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export default async function FreeTicketClaimPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode).trim()
  const payload = await getPayloadClient()

  let links = await payload.find({
    collection: 'free-ticket-links' as any,
    overrideAccess: true,
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
  })
  if (!links.docs[0] && code !== code.toUpperCase()) {
    links = await payload.find({
      collection: 'free-ticket-links' as any,
      overrideAccess: true,
      where: { code: { equals: code.toUpperCase() } },
      limit: 1,
      depth: 0,
    })
  }
  const link: any = links.docs[0]
  if (!link) notFound()

  const eventId = typeof link.event === 'object' ? link.event.id : link.event
  const ticketTypeId = link.ticketType
    ? typeof link.ticketType === 'object'
      ? link.ticketType.id
      : link.ticketType
    : null

  const [event, ticketType] = await Promise.all([
    payload
      .findByID({
        collection: 'events',
        id: eventId,
        overrideAccess: true,
        draft: true,
        depth: 0,
      })
      .catch(() => null),
    ticketTypeId
      ? payload
          .findByID({
            collection: 'ticket-types',
            id: ticketTypeId,
            overrideAccess: true,
            depth: 0,
          })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  if (!event) notFound()

  const invitationType: 'individual' | 'shareable' =
    link.invitationType === 'shareable' || Number(link.maxClaims || 1) > 1
      ? 'shareable'
      : 'individual'
  const maxClaims = Math.max(1, Number(link.maxClaims || 1))
  const claimedCount = Math.max(0, Number(link.claimedCount || (link.status === 'claimed' ? 1 : 0)))
  const remainingClaims = Math.max(0, maxClaims - claimedCount)
  const ticketLabel =
    (typeof link.categoryLabel === 'string' && link.categoryLabel.trim()) ||
    ticketType?.name ||
    'Private Invitation Pass'

  let linkStatus: 'active' | 'claimed' | 'expired' | 'revoked' | 'exhausted' | 'unavailable' =
    'active'
  let reason = ''

  if (link.status === 'revoked') {
    linkStatus = 'revoked'
    reason = 'This private invitation link was revoked by the event organizer.'
  } else if (
    link.status === 'expired' ||
    (link.expiresAt && new Date(link.expiresAt).valueOf() <= Date.now())
  ) {
    linkStatus = 'expired'
    reason = 'This private invitation link has expired.'
  } else if (link.status === 'claimed' || link.status === 'exhausted' || remainingClaims <= 0) {
    linkStatus = invitationType === 'shareable' ? 'exhausted' : 'claimed'
    reason =
      invitationType === 'shareable'
        ? 'All available passes for this private invitation link have been claimed.'
        : 'This private invitation link has already been claimed.'
  } else if (event._status !== 'published' || event.reviewStatus !== 'approved') {
    linkStatus = 'unavailable'
    reason = 'This event is pending approval or not currently open for ticket claims.'
  }

  return (
    <FreeTicketClaim
      code={link.code}
      linkStatus={linkStatus}
      reason={reason}
      invitationType={invitationType}
      maxClaims={maxClaims}
      claimedCount={claimedCount}
      remainingClaims={remainingClaims}
      eventTitle={event.title}
      eventSlug={event.slug || undefined}
      eventDate={
        event.startsAt
          ? formatReadableDateTime(event.startsAt, (event as any).timezone)
          : undefined
      }
      eventVenue={event.venue || undefined}
      ticketName={ticketLabel}
      recipientName={link.recipientName || undefined}
      recipientEmail={link.recipientEmail || undefined}
      personalMessage={link.personalMessage || undefined}
      expiresAt={link.expiresAt || undefined}
    />
  )
}
