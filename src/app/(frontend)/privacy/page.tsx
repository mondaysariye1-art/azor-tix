import Link from 'next/link'
export default function PrivacyPage() {
  return (
    <main className="success shell">
      <span className="eyebrow">Privacy</span>
      <h1>
        Your data, <em>respected.</em>
      </h1>
      <p>
        AZOR TIX uses customer details only to process orders, issue tickets, prevent fraud and
        support event operations. Payment credentials are handled by Paystack and are never stored
        by AZOR TIX.
      </p>
      <Link className="button button-dark" href="/">
        Back home
      </Link>
    </main>
  )
}
