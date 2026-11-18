import AzorSite from '@/components/AzorSite'
import { getPublicEvents } from '@/lib/public-events'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  return <AzorSite events={await getPublicEvents()} initialPath="/" />
}
