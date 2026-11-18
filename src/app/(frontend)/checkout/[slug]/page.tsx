import { notFound } from 'next/navigation'
import AzorSite from '@/components/AzorSite'
import { getPublicEvent, getPublicEvents } from '@/lib/public-events'

export async function generateStaticParams() {
  return (await getPublicEvents()).map((event) => ({ slug: event.id }))
}

export default async function CheckoutPage({ params }: PageProps<'/checkout/[slug]'>) {
  const { slug } = await params
  const event = await getPublicEvent(slug)
  if (!event || !event.ticketTypeId) notFound()
  return <AzorSite events={await getPublicEvents()} initialPath={`/checkout/${slug}`} />
}
