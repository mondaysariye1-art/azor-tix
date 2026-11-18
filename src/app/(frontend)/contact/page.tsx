import Link from 'next/link'
import ContactForm from '@/components/ContactForm'
export default function ContactPage() {
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
      <Link className="button button-dark" href="/">
        Back home
      </Link>
    </main>
  )
}
