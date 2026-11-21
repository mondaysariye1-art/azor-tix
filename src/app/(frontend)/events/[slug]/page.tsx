import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import AzorSite from '@/components/AzorSite'
import { getPublicNavigationUser } from '@/lib/app-auth'
import { getPublicEvents, resolvePublicEventBySlug } from '@/lib/public-events'

export const dynamic = 'force-dynamic'

async function resolveOrigin() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host')
  const proto = headerList.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function generateMetadata({
  params,
}: PageProps<'/events/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const { event } = await resolvePublicEventBySlug(slug)
  if (!event) {
    return {
      title: 'Event not found — AZORTIX',
      description: 'Explore upcoming concerts, conferences, and nightlife in Abuja on AZORTIX.',
    }
  }

  const origin = await resolveOrigin()
  const canonicalUrl = `${origin}/events/${event.id}`
  const imageUrl = event.image.startsWith('http') ? event.image : `${origin}${event.image}`
  const summary =
    event.shortDescription ||
    (event.description ? event.description.slice(0, 155) : `${event.title} at ${event.location}, Abuja.`)

  return {
    title: `${event.title} — AZORTIX`,
    description: summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      siteName: 'AZORTIX',
      url: canonicalUrl,
      title: event.title,
      description: summary,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: summary,
      images: [imageUrl],
    },
  }
}

export default async function EventPage({ params }: PageProps<'/events/[slug]'>) {
  const { slug } = await params
  const { event, redirectSlug } = await resolvePublicEventBySlug(slug)
  if (redirectSlug) {
    permanentRedirect(`/events/${redirectSlug}`)
  }
  if (!event) notFound()
  const [events, origin, currentUser] = await Promise.all([
    getPublicEvents(),
    resolveOrigin(),
    getPublicNavigationUser(),
  ])
  const allEvents = events.some((item) => item.id === event.id) ? events : [event, ...events]
  const imageUrl = event.image.startsWith('http') ? event.image : `${origin}${event.image}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.shortDescription || event.description || event.title,
    startDate: event.startsAtISO,
    endDate: event.endsAtISO || event.startsAtISO,
    image: [imageUrl],
    url: `${origin}/events/${event.id}`,
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address || event.location,
        addressLocality: 'Abuja',
        addressRegion: 'FCT',
        addressCountry: 'NG',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.host,
    },
    offers: (event.ticketTypes || []).map((ticket) => ({
      '@type': 'Offer',
      name: ticket.name,
      price: String(ticket.price),
      priceCurrency: 'NGN',
      url: `${origin}/checkout/${event.id}?ticket=${encodeURIComponent(ticket.id)}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AzorSite events={allEvents} initialPath={`/events/${slug}`} currentUser={currentUser} />
    </>
  )
}
