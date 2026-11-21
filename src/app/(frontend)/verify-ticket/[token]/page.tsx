import Image from 'next/image'
import Link from 'next/link'
import { Lock, LogIn, ShieldAlert } from 'lucide-react'
import { VerifyTicketClient } from '@/components/VerifyTicketClient'
import { getCurrentAppUser } from '@/lib/app-auth'
import { inspectTicketForAuthorizedStaff } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

export default async function VerifyTicketPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const user = await getCurrentAppUser()

  const isAuthorizedRole =
    Boolean(user) &&
    ['organizer', 'admin', 'super-admin'].includes(String((user as any)?.role || '')) &&
    String((user as any)?.status || 'active') === 'active'

  if (!user || !isAuthorizedRole) {
    return (
      <main className="ticket-invite-page">
        <article className="ticket-invite-card verify-gate-card">
          <div className="ticket-invite-top-rule" aria-hidden="true" />
          <header className="ticket-invite-header">
            <Image
              src="/assets/azor-tix-wordmark-black.png"
              alt="AZORTIX"
              width={642}
              height={214}
              priority
              referrerPolicy="no-referrer"
              className="ticket-invite-logo"
            />
          </header>

          <section className="verify-gate-body">
            <div className="verify-gate-icon" aria-hidden="true">
              <Lock size={26} />
            </div>
            <h1>Authorized Check-In Only</h1>
            <p>
              This QR verification link is reserved for authorized event organizers and door
              check-in staff. Attendees cannot self-check-in.
            </p>
            <p className="verify-gate-sub">
              If you are an event organizer or check-in staff member, sign in to inspect and check
              in this ticket.
            </p>
            <div className="verify-gate-actions">
              <Link href="/login" className="ticket-btn ticket-btn-primary">
                <LogIn size={15} aria-hidden="true" />
                <span>Sign In as Event Staff</span>
              </Link>
              <Link href="/discover" className="ticket-btn ticket-btn-outline">
                <span>Browse Events</span>
              </Link>
            </div>
          </section>

          <footer className="ticket-invite-support">
            <h2>Questions?</h2>
            <p>For assistance with your ticket or event registration, contact:</p>
            <a href="mailto:tickets@azortix.org" className="ticket-support-email">
              tickets@azortix.org
            </a>
          </footer>
        </article>
      </main>
    )
  }

  const inspection = await inspectTicketForAuthorizedStaff({
    rawInput: token,
    user: {
      id: String(user.id),
      email: String((user as any).email || ''),
      role: String((user as any).role || ''),
    },
  })

  const dashboardUrl = `/dashboard/${(user as any).role}`

  return (
    <main className="ticket-invite-page">
      <article className="ticket-invite-card verify-gate-card">
        <div className="ticket-invite-top-rule" aria-hidden="true" />
        <header className="ticket-invite-header">
          <Image
            src="/assets/azor-tix-wordmark-black.png"
            alt="AZORTIX"
            width={642}
            height={214}
            priority
            referrerPolicy="no-referrer"
            className="ticket-invite-logo"
          />
        </header>

        <section className="verify-staff-header">
          <span className="verify-staff-kicker">
            <ShieldAlert size={13} aria-hidden="true" />
            <span>Staff Ticket Verification</span>
          </span>
          <h1>Door Entry Check</h1>
          <p>
            Signed in as <strong>{(user as any).name || (user as any).email}</strong>. Review the
            ticket details below before confirming one-time entry.
          </p>
        </section>

        <VerifyTicketClient
          token={token}
          initialResult={inspection}
          dashboardUrl={dashboardUrl}
        />
      </article>
    </main>
  )
}
