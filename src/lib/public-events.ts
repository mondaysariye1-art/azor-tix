import 'server-only'
import { findBySlug, getPayloadClient } from '@/lib/payload'
import type { EventItem } from '@/components/AzorSite'

type Related = { id: number | string; name?: string; businessName?: string; url?: string }
type EventDocument = Record<string, any>

function relationID(value: unknown) {
  return typeof value === 'object' && value !== null && 'id' in value
    ? (value as Related).id
    : value
}

async function normalizeEvents(docs: EventDocument[]): Promise<EventItem[]> {
  const payload = await getPayloadClient()
  return Promise.all(
    docs.map(async (event) => {
      const ticketResult = await payload.find({
        collection: 'ticket-types',
        overrideAccess: false,
        where: {
          and: [{ event: { equals: event.id } }, { active: { equals: true } }],
        },
        limit: 20,
        sort: 'price',
        depth: 0,
      })
      const firstTicket = ticketResult.docs[0]
      const ticketTypes = ticketResult.docs.map((ticket: any) => ({
        id: String(ticket.id),
        name: String(ticket.name),
        description: ticket.description ? String(ticket.description) : undefined,
        price: Number(ticket.price),
        maxPerOrder: Number(ticket.maxPerOrder || 8),
      }))
      const rawStart = event.startsAt ? new Date(event.startsAt) : null
      const startsAt =
        rawStart && Number.isFinite(rawStart.valueOf()) ? rawStart : new Date(event.createdAt || Date.now())
      const rawEnd = event.endsAt ? new Date(event.endsAt) : null
      const endsAt = rawEnd && Number.isFinite(rawEnd.valueOf()) ? rawEnd : null
      const organizer = event.organizer as Related | string | number
      const image = event.heroImage as Related | string | number

      const formattedDate = new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      }).format(startsAt)
      const formattedTime = new Intl.DateTimeFormat('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Africa/Lagos',
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
            timeZone: 'Africa/Lagos',
          })
          .toUpperCase()
          .replace(',', ''),
        location: String(event.venue || 'Abuja venue'),
        address: event.address ? String(event.address) : undefined,
        city: 'Abuja',
        category: String(event.category),
        eventFormat: event.eventFormat ? String(event.eventFormat) : 'physical',
        virtualLink: event.virtualLink ? String(event.virtualLink) : undefined,
        price: Number(firstTicket?.price || 0),
        image: typeof image === 'object' && image?.url ? image.url : '/favicon.svg',
        host:
          typeof organizer === 'object'
            ? organizer.businessName || organizer.name || 'AZOR TIX organizer'
            : 'AZOR TIX organizer',
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
        ticketTypeId: firstTicket ? String(relationID(firstTicket.id)) : undefined,
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
  if (!event || (event as EventDocument)._status !== 'published') return null
  const [normalized] = await normalizeEvents([event as EventDocument])
  return normalized
}
