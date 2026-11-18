import AzorSite from '@/components/AzorSite'
import { getPublicEvents } from '@/lib/public-events'

export default async function OrganizersPage() {
  return <AzorSite events={await getPublicEvents()} initialPath="/organizers" />
}
