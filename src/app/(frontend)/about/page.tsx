import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getPublicNavigationUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const navUser = await getPublicNavigationUser()
  return (
    <main className="success shell">
      <span className="eyebrow">About AZORTIX</span>
      <h1>
        Made for <em>Abuja.</em>
      </h1>
      <p>
        AZORTIX brings the city’s events, organizers and audiences together with clear ticketing
        and calmer doors.
      </p>
      <div className="flex flex-wrap gap-3">
        {navUser && (
          <BackToDashboardButton
            dashboardUrl={navUser.dashboardUrl}
            className="button button-cream"
          />
        )}
        <Link className="button button-dark" href="/discover">
          Discover events
        </Link>
      </div>
    </main>
  )
}
