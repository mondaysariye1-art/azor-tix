import Link from 'next/link'
export default function CareersPage() {
  return (
    <main className="success shell">
      <span className="eyebrow">Careers</span>
      <h1>
        Build the way <em>in.</em>
      </h1>
      <p>
        There are no open roles today. Send a thoughtful introduction to careers@azortix.com for
        future Abuja-based opportunities.
      </p>
      <Link className="button button-dark" href="/">
        Back home
      </Link>
    </main>
  )
}
