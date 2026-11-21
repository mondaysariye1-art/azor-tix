import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getPublicNavigationUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const navUser = await getPublicNavigationUser()
  return (
    <main className="success shell">
      <span className="eyebrow">Privacy</span>
      <h1>
        Your data, <em>respected.</em>
      </h1>
      <p>
        AZORTIX uses customer details only to process orders, issue tickets, prevent fraud and
        support event operations. Payment credentials are handled by Paystack and are never stored
        by AZORTIX.
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
