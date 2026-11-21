import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getPublicNavigationUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const navUser = await getPublicNavigationUser()
  return (
    <main className="success shell">
      <span className="eyebrow">Terms</span>
      <h1>
        Clear rules. <em>Good times.</em>
      </h1>
      <p>
        Tickets are valid only for the named event and may be scanned once. Refund eligibility
        follows the published event policy and Nigerian consumer law.
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
