import Link from 'next/link'
export default function PaymentErrorPage() {
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
      <Link className="button button-dark" href="/discover">
        Return to events
      </Link>
    </main>
  )
}
