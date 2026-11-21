import 'server-only'
import { resolveTimeZone } from '@/lib/format'
import { findBySlug, getPayloadClient } from '@/lib/payload'
import { getPgPool } from '@/lib/postgres'
import type { EventItem } from '@/components/AzorSite'

type Related = { id: number | string; name?: string; businessName?: string; url?: string }
type EventDocument = Record<string, any>

function relationID(value: unknown) {
  return typeof value === 'object' && value !== null && 'id' in value
    ? (value as Related).id
    : value
}

async function getSoldCountsByTicketType(ticketTypeIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (ticketTypeIds.length === 0) return counts
  const pool = getPgPool(false)
  const res = await pool.query<{ ticket_type_id: string; sold: number }>(
    `SELECT "ticket_type_id", COUNT(*)::int AS sold
     FROM "tickets"
     WHERE "ticket_type_id" = ANY($1::uuid[])
       AND "status"::text NOT IN ('refunded', 'void', 'cancelled')
     GROUP BY "ticket_type_id"`,
    [ticketTypeIds],
  )
  for (const row of res.rows) {
    counts.set(String(row.ticket_type_id), Number(row.sold || 0))
  }
  return counts
}

async function normalizeEvents(docs: EventDocument[]): Promise<EventItem[]> {
  const payload = await getPayloadClient()
  const nowMs = Date.now()

  return Promise.all(
    docs.map(async (event) => {
      const ticketResult = await payload.find({
        collection: 'ticket-types',
        overrideAccess: false,
        where: {
          and: [
            { event: { equals: event.id } },
            { active: { equals: true } },
            {
              or: [
                { visibility: { equals: 'public' } },
                { visibility: { exists: false } },
              ],
            },
            {
              or: [
                { salesStatus: { not_equals: 'paused' } },
                { salesStatus: { exists: false } },
              ],
            },
          ],
        },
        limit: 40,
        sort: 'price',
        depth: 0,
      })

      const publicDocs = (ticketResult.docs as any[]).filter(
        (t) => t.visibility !== 'invite-only' && t.salesStatus !== 'paused' && t.active !== false,
      )
      const soldMap = await getSoldCountsByTicketType(publicDocs.map((t) => String(t.id)))

      const ticketTypes = publicDocs.map((ticket: any) => {
        const quantity = Math.max(0, Number(ticket.quantity || 0))
        const sold = soldMap.get(String(ticket.id)) || 0
        const remaining = Math.max(0, quantity - sold)
        const opensAtMs = ticket.salesOpenAt ? new Date(ticket.salesOpenAt).valueOf() : null
        const closesAtMs = ticket.salesCloseAt ? new Date(ticket.salesCloseAt).valueOf() : null
        const outsideWindow =
          (opensAtMs !== null && Number.isFinite(opensAtMs) && opensAtMs > nowMs) ||
          (closesAtMs !== null && Number.isFinite(closesAtMs) && closesAtMs < nowMs)
        const soldOut = remaining <= 0 || ticket.salesStatus === 'sold-out'

        return {
          id: String(ticket.id),
          name: String(ticket.name),
          ticketKind: (ticket.ticketKind === 'free' || Number(ticket.price) === 0 ? 'free' : 'paid') as
            | 'free'
            | 'paid',
          description: ticket.description ? String(ticket.description) : undefined,
          price: Number(ticket.price),
          quantity,
          sold,
          remaining,
          minPerOrder: Math.max(1, Number(ticket.minPerOrder || 1)),
          maxPerOrder: Math.max(1, Math.min(remaining || 1, Number(ticket.maxPerOrder || 8))),
          ticketMode: ticket.ticketMode === 'group' ? ('group' as const) : ('single' as const),
          groupSize: ticket.ticketMode === 'group' ? Math.max(2, Number(ticket.groupSize || 2)) : 1,
          soldOut,
          outsideWindow,
        }
      })

      const availableTicket =
        ticketTypes.find((t) => !t.soldOut && !t.outsideWindow) || ticketTypes[0]
      const rawStart = event.startsAt ? new Date(event.startsAt) : null
      const startsAt =
        rawStart && Number.isFinite(rawStart.valueOf())
          ? rawStart
          : new Date(event.createdAt || Date.now())
      const rawEnd = event.endsAt ? new Date(event.endsAt) : null
      const endsAt = rawEnd && Number.isFinite(rawEnd.valueOf()) ? rawEnd : null
      const organizer = event.organizer as Related | string | number
      const image = event.heroImage as Related | string | number

      const eventTz = resolveTimeZone(event.timezone)
      const formattedDate = new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: eventTz,
      }).format(startsAt)
      const formattedTime = new Intl.DateTimeFormat('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: eventTz,
      }).format(startsAt)

      return {
        id: String(event.slug || event.id),
        slug: String(event.slug || event.id),
        title: String(event.title),
        date: formattedDate,
        formattedTime,
        startsAtISO: startsAt.toISOString(),
        endsAtISO: endsAt ? endsAt.toISOString() : undefined,
        shortDate: startsAt
          .toLocaleDateString('en-NG', {
            day: '2-digit',
            month: 'short',
            timeZone: eventTz,
          })
          .toUpperCase()
          .replace(',', ''),
        location: String(event.venue || 'Abuja venue'),
        address: event.address ? String(event.address) : undefined,
        city: 'Abuja',
        category: String(event.category),
        eventFormat: event.eventFormat ? String(event.eventFormat) : 'physical',
        virtualLink: event.virtualLink ? String(event.virtualLink) : undefined,
        price: availableTicket ? Number(availableTicket.price) : 0,
        image: typeof image === 'object' && image?.url ? image.url : '/favicon.svg',
        host:
          typeof organizer === 'object'
            ? organizer.businessName || organizer.name || 'AZORTIX organizer'
            : 'AZORTIX organizer',
        shortDescription: event.shortDescription ? String(event.shortDescription) : undefined,
        description: event.description ? String(event.description) : undefined,
        refundPolicy: event.refundPolicy ? String(event.refundPolicy) : undefined,
        attendeeQuestions: Array.isArray(event.attendeeQuestions)
          ? event.attendeeQuestions.map((question: any) => ({
              label: String(question.label),
              type: question.type,
              required: Boolean(question.required),
              options: Array.isArray(question.options)
                ? question.options.map((option: any) => String(option.label))
                : [],
            }))
          : [],
        ticketTypeId: availableTicket ? String(relationID(availableTicket.id)) : undefined,
        ticketTypes,
      }
    }),
  )
}

export async function getPublicEvents() {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'events',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { reviewStatus: { equals: 'approved' } },
        {
          or: [{ visibility: { equals: 'public' } }, { visibility: { exists: false } }],
        },
      ],
    },
    limit: 100,
    sort: 'startsAt',
    depth: 2,
  })
  return normalizeEvents(result.docs as EventDocument[])
}

export async function getPublicEvent(slug: string) {
  const event = await findBySlug('events', slug, { draft: false, depth: 2 })
  if (
    !event ||
    (event as EventDocument)._status !== 'published' ||
    (event as EventDocument).reviewStatus !== 'approved'
  ) {
    return null
  }
  const [normalized] = await normalizeEvents([event as EventDocument])
  return normalized
}

export async function resolvePublicEventBySlug(slug: string): Promise<{
  event: EventItem | null
  redirectSlug: string | null
}> {
  const direct = await getPublicEvent(slug)
  if (direct) return { event: direct, redirectSlug: null }

  const payload = await getPayloadClient()
  const legacy = await payload.find({
    collection: 'events',
    overrideAccess: true,
    draft: false,
    limit: 1,
    depth: 2,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { reviewStatus: { equals: 'approved' } },
        { 'previousSlugs.slug': { equals: slug } },
      ],
    },
  })
  const matched = legacy.docs[0] as EventDocument | undefined
  if (matched?.slug && matched.slug !== slug) {
    const [normalized] = await normalizeEvents([matched])
    return { event: normalized, redirectSlug: String(matched.slug) }
  }
  return { event: null, redirectSlug: null }
}
