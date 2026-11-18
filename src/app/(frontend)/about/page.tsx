import Link from 'next/link'
export default function AboutPage() {
  return (
    <main className="success shell">
      <span className="eyebrow">About AZOR TIX</span>
      <h1>
        Made for <em>Abuja.</em>
      </h1>
      <p>
        AZOR TIX brings the city’s events, organizers and audiences together with clear ticketing
        and calmer doors.
      </p>
      <Link className="button button-dark" href="/discover">
        Discover events
      </Link>
    </main>
  )
}
