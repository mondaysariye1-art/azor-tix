import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getPublicNavigationUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function CareersPage() {
  const navUser = await getPublicNavigationUser()
  return (
    <main className="success shell">
      <span className="eyebrow">Careers</span>
      <h1>
        Build the way <em>in.</em>
      </h1>
      <p>
        There are no open roles today. Send a thoughtful introduction to careers@azortix.com for
        future Abuja-based opportunities.
      </p>
      <div className="flex flex-wrap gap-3">
        {navUser && (
          <BackToDashboardButton
            dashboardUrl={navUser.dashboardUrl}
            className="button button-cream"
          />
        )}
        <Link className="button button-dark" href="/">
          Back home
        </Link>
      </div>
    </main>
  )
}
