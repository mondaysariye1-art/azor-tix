import { notFound } from 'next/navigation'
import AzorSite from '@/components/AzorSite'
import { getPublicNavigationUser } from '@/lib/app-auth'
import { getPublicEvent, getPublicEvents } from '@/lib/public-events'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({ params }: PageProps<'/checkout/[slug]'>) {
  const { slug } = await params
  const [event, events, currentUser] = await Promise.all([
    getPublicEvent(slug),
    getPublicEvents(),
    getPublicNavigationUser(),
  ])
  if (!event || !event.ticketTypeId) notFound()
  const allEvents = events.some((item) => item.id === event.id) ? events : [event, ...events]
  return (
    <AzorSite
      events={allEvents}
      initialPath={`/checkout/${slug}`}
      currentUser={currentUser}
    />
  )
}
