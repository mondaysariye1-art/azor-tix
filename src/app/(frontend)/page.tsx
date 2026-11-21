import AzorSite from '@/components/AzorSite'
import { getPublicNavigationUser } from '@/lib/app-auth'
import { getPublicEvents } from '@/lib/public-events'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [events, currentUser] = await Promise.all([
    getPublicEvents(),
    getPublicNavigationUser(),
  ])
  return <AzorSite events={events} initialPath="/" currentUser={currentUser} />
}
