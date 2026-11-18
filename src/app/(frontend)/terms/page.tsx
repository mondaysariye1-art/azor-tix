import Link from 'next/link'
export default function TermsPage() {
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
      <Link className="button button-dark" href="/">
        Back home
      </Link>
    </main>
  )
}
