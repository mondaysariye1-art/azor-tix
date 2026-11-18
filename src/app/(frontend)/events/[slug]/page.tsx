import { notFound } from 'next/navigation'
import AzorSite from '@/components/AzorSite'
import { getPublicEvent, getPublicEvents } from '@/lib/public-events'

export async function generateStaticParams() {
  return (await getPublicEvents()).map((event) => ({ slug: event.id }))
}

export default async function EventPage({ params }: PageProps<'/events/[slug]'>) {
  const { slug } = await params
  if (!(await getPublicEvent(slug))) notFound()
  return <AzorSite events={await getPublicEvents()} initialPath={`/events/${slug}`} />
}
