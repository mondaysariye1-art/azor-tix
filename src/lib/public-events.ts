import 'server-only'
import { unstable_cache } from 'next/cache'
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
      const startsAt = new Date(event.startsAt)
      const organizer = event.organizer as Related | string | number
      const image = event.heroImage as Related | string | number

      return {
        id: String(event.slug),
        title: String(event.title),
        date: new Intl.DateTimeFormat('en-NG', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'Africa/Lagos',
        }).format(startsAt),
        shortDate: startsAt
          .toLocaleDateString('en-NG', {
            day: '2-digit',
            month: 'short',
            timeZone: 'Africa/Lagos',
          })
          .toUpperCase()
          .replace(',', ''),
        location: String(event.venue),
        city: 'Abuja',
        category: String(event.category),
        price: Number(firstTicket?.price || 0),
        image: typeof image === 'object' && image?.url ? image.url : '/favicon.svg',
        host:
          typeof organizer === 'object'
            ? organizer.businessName || organizer.name || 'AZOR TIX organizer'
            : 'AZOR TIX organizer',
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

const getPublicEventsCached = unstable_cache(
  async () => {
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
  },
  ['public-events'],
  { revalidate: 3600, tags: ['public-events'] },
)

export async function getPublicEvents() {
  return getPublicEventsCached()
}

export async function getPublicEvent(slug: string) {
  return unstable_cache(
    async () => {
      const event = await findBySlug('events', slug, { depth: 2 })
      if (!event) return null
      const [normalized] = await normalizeEvents([event as EventDocument])
      return normalized
    },
    ['public-event', slug],
    { revalidate: 3600, tags: ['public-events', `event:${slug}`] },
  )()
}
