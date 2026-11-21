import Link from 'next/link'
import { BackToDashboardButton } from '@/components/BackToDashboardButton'
import ContactForm from '@/components/ContactForm'
import { getPublicNavigationUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const navUser = await getPublicNavigationUser()
  return (
    <main className="success shell">
      <span className="eyebrow">Contact</span>
      <h1>
        Let’s sort it <em>out.</em>
      </h1>
      <p>
        For ticket help, organizer support or complaints, send the secure form below and include
        your order reference.
      </p>
      <ContactForm />
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
