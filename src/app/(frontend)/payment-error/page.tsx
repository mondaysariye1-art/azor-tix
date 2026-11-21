import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import { getCurrentAppUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function PaymentErrorPage() {
  const user = await getCurrentAppUser()
  const dashboardUrl = user ? `/dashboard/${user.role}` : null

  return (
    <main className="success shell">
      <span className="eyebrow">Payment incomplete</span>
      <h1>
        We couldn’t <em>confirm that.</em>
      </h1>
      <p>
        No ticket was issued. If your account was debited, contact support with your Paystack
        reference.
      </p>
      <div className="success-actions">
        <Link className="button button-dark" href="/discover">
          Return to events
        </Link>
        <BackToDashboardButton dashboardUrl={dashboardUrl} className="button button-cream" />
      </div>
    </main>
  )
}
