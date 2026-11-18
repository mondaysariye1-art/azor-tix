import Link from 'next/link'

/**
 * Custom not-found page for the frontend.
 * This renders when `notFound()` is called from any page in the (frontend) route group.
 *
 * Customize this component to match your app's design and provide helpful navigation.
 */
export default function NotFound() {
  return (
    <main className="not-found shell">
      <span>404</span>
      <h1>
        Wrong turn.
        <br />
        <em>Good taste.</em>
      </h1>
      <p>That page has left the venue.</p>
      <Link className="button button-dark" href="/">
        Back home
      </Link>
    </main>
  )
}
