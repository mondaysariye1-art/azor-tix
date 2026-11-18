'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

import { BrandLogo } from './BrandLogo'

export type EventItem = {
  id: string
  title: string
  date: string
  shortDate: string
  location: string
  city: string
  category: string
  price: number
  image: string
  host: string
  description?: string
  refundPolicy?: string
  attendeeQuestions?: {
    label: string
    type: 'text' | 'multiple-choice' | 'checkbox' | 'date'
    required?: boolean
    options?: string[]
  }[]
  ticketTypeId?: string
  ticketTypes?: {
    id: string
    name: string
    description?: string
    price: number
    maxPerOrder: number
  }[]
}

const formatMoney = (value: number) => `₦${value.toLocaleString()}`

const Icon = ({ name, size = 20 }: { name: string; size?: number }) => {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    ticket: (
      <>
        <path d="M3 9a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V5H3v4Z" />
        <path d="M13 5v3M13 11v2M13 16v3" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".5" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function LinkButton({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={to} className={className}>
      {children}
    </Link>
  )
}

function Logo({ light = false }: { light?: boolean }) {
  return <BrandLogo light={light} />
}

function Header({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <header className={`header ${dark ? 'header-dark' : ''}`}>
      <div className="nav-shell">
        <Logo light={dark} />
        <nav className={open ? 'nav-open' : ''}>
          <LinkButton to="/discover">Discover events</LinkButton>
          <LinkButton to="/organizers">For organizers</LinkButton>
          <LinkButton to="/login" className="nav-login">
            Log in
          </LinkButton>
          <LinkButton to="/register" className="button button-small">
            Create event <Icon name="arrow" size={16} />
          </LinkButton>
        </nav>
        <button
          className="menu-button"
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  )
}

function Footer() {
  const [subscription, setSubscription] = useState('')
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const email = String(new FormData(form).get('email') || '')
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const result = await response.json()
    setSubscription(result.message || result.error)
    if (response.ok) form.reset()
  }
  return (
    <footer>
      <div className="footer-main shell">
        <div className="footer-brand">
          <Logo light />
          <p>
            More moments.
            <br />
            Less friction.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <LinkButton to="/discover">Discover events</LinkButton>
          <LinkButton to="/register">Create an event</LinkButton>
          <a href="#how">How it works</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/about">About us</a>
          <a href="/careers">Careers</a>
          <a href="/contact">Contact</a>
        </div>
        <div>
          <h4>Get occasional good news</h4>
          <form className="subscribe" onSubmit={subscribe}>
            <input
              name="email"
              type="email"
              required
              aria-label="Email address"
              placeholder="Your email address"
            />
            <button type="submit" aria-label="Subscribe">
              <Icon name="arrow" />
            </button>
          </form>
          {subscription && <small className="subscribe-status">{subscription}</small>}
          <div className="social">
            <Icon name="instagram" />
            <span>Instagram</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom shell">
        <span>© 2025 AZOR TIX. Made for Abuja.</span>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  )
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <LinkButton to={`/events/${event.id}`} className="event-card">
      <div className="event-image">
        <Image src={event.image} alt={`${event.title} event`} width={900} height={650} />
        <span>{event.category}</span>
      </div>
      <div className="event-body">
        <div className="date-tile">
          <b>{event.shortDate.split(' ')[1]}</b>
          <span>{event.shortDate.split(' ')[0]}</span>
        </div>
        <div>
          <h3>{event.title}</h3>
          <p>{event.date.split(' · ')[0]}</p>
          <p className="muted">
            {event.location}, {event.city}
          </p>
          <strong>From {formatMoney(event.price)}</strong>
        </div>
      </div>
    </LinkButton>
  )
}

function HomePage({ events }: { events: EventItem[] }) {
  return (
    <>
      <div className="home-hero-wrap">
        <Header dark />
        <section className="home-hero shell">
          <div className="eyebrow light">Your next story starts here</div>
          <h1>
            Find your
            <br />
            <em>kind of energy.</em>
          </h1>
          <p>Abuja’s best events, one effortless ticket away.</p>
          <LinkButton to="/discover" className="button button-coral">
            Explore events <Icon name="arrow" />
          </LinkButton>
          <div className="hero-stamp">
            <span>GOOD</span>
            <b>TIMES</b>
            <span>ONLY</span>
          </div>
        </section>
        <div className="hero-counter shell">
          <span>Scroll to discover</span>
          <i />
          <b>01</b>
          <span>/ 04</span>
        </div>
      </div>

      <main>
        <section className="section shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Curated for you</span>
              <h2>
                Things worth
                <br />
                <em>showing up for</em>
              </h2>
            </div>
            <LinkButton to="/discover" className="text-link">
              See all events <Icon name="arrow" />
            </LinkButton>
          </div>
          <div className="event-grid">
            {events.slice(0, 3).map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </section>

        <section className="manifesto">
          <div className="manifesto-image">
            <Image
              src="https://images.unsplash.com/photo-1777115217449-ec667e63a54f?auto=format&fit=crop&w=1200&q=85"
              alt="Friends enjoying a colourful celebration"
              width={1200}
              height={900}
            />
          </div>
          <div className="manifesto-copy">
            <span className="eyebrow light">Go where life happens</span>
            <h2>
              Not just a ticket.
              <br />A way <em>in.</em>
            </h2>
            <p>
              The best nights never fit in a caption. Find the rooms, stages, tables and dancefloors
              where your next favourite memory is waiting.
            </p>
            <LinkButton to="/discover" className="button button-cream">
              Find your moment <Icon name="arrow" />
            </LinkButton>
          </div>
        </section>

        <section className="category-section shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Browse your mood</span>
              <h2>
                There is always
                <br />
                <em>something on</em>
              </h2>
            </div>
          </div>
          <div className="categories">
            {['Music', 'Food & Drink', 'Arts & Culture', 'Nightlife', 'Business', 'Wellness'].map(
              (item, i) => (
                <LinkButton
                  key={item}
                  to={`/discover?category=${encodeURIComponent(item)}`}
                  className="category-row"
                >
                  <span>0{i + 1}</span>
                  <h3>{item}</h3>
                  <Icon name="arrow" size={28} />
                </LinkButton>
              ),
            )}
          </div>
        </section>

        <section className="organizer-banner shell">
          <div>
            <span className="eyebrow light">Built for hosts who care</span>
            <h2>
              Your event deserves
              <br />a <em>full house.</em>
            </h2>
            <p>
              Create beautiful event pages, sell tickets and understand your audience—all in one
              calm, powerful place.
            </p>
            <LinkButton to="/organizers" className="button button-coral">
              Start selling <Icon name="arrow" />
            </LinkButton>
          </div>
          <div className="ticket-art">
            <div className="mini-ticket">
              <span>ADMIT ONE</span>
              <b>
                AZOR
                <br />
                SESSIONS
              </b>
              <small>ABUJA · 2025</small>
            </div>
            <div className="ring">A</div>
          </div>
        </section>

        <section id="how" className="steps shell">
          <span className="eyebrow">Simple by design</span>
          <h2>
            From “what’s on?”
            <br />
            to <em>you’re in.</em>
          </h2>
          <div className="step-grid">
            {[
              [
                '01',
                'Find your thing',
                'Explore a fresh mix of events made for every version of you.',
              ],
              [
                '02',
                'Pick your spot',
                'Choose your ticket, pay securely and get instant confirmation.',
              ],
              [
                '03',
                'Show up',
                'Your QR ticket lives in your inbox. All that is left is the good part.',
              ],
            ].map(([n, t, p]) => (
              <div className="step" key={n}>
                <span>{n}</span>
                <Icon name={n === '01' ? 'search' : n === '02' ? 'ticket' : 'check'} size={28} />
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function DiscoverPage({ events }: { events: EventItem[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  useEffect(() => {
    setCategory(new URLSearchParams(window.location.search).get('category') || 'All')
  }, [])
  const categories = ['All', 'Music', 'Festival', 'Conference', 'Lifestyle', 'Community']
  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (category === 'All' || e.category === category) &&
          e.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, category],
  )
  return (
    <>
      <Header />
      <main className="discover-page">
        <section className="discover-head shell">
          <span className="eyebrow">All of Abuja, one place</span>
          <h1>
            Discover what’s <em>next.</em>
          </h1>
          <div className="search-bar">
            <Icon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, artists or venues"
            />
            <button>Search</button>
          </div>
        </section>
        <section className="shell discover-content">
          <div className="filter-row">
            <div className="pills">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={category === c ? 'active' : ''}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="city-lock">
              <Icon name="pin" size={15} />
              Abuja only
            </div>
          </div>
          <div className="results-title">
            <h2>{filtered.length ? 'Events you’ll love' : 'Nothing here yet'}</h2>
            <span>{filtered.length} events</span>
          </div>
          {filtered.length ? (
            <div className="event-grid discover-grid">
              {filtered.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <Icon name="search" size={32} />
              <h3>Try another search</h3>
              <p>New moments are added every week.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}

function EventPage({ event, events }: { event: EventItem; events: EventItem[] }) {
  const [qty, setQty] = useState(1)
  const [ticketTypeId, setTicketTypeId] = useState(event.ticketTypeId)
  const [shared, setShared] = useState(false)
  const ticketTypes = event.ticketTypes || []
  const selectedTicket = ticketTypes.find((ticket) => ticket.id === ticketTypeId) || ticketTypes[0]
  const share = async () => {
    setShared(true)
    if (navigator.share)
      await navigator.share({ title: event.title, url: window.location.href }).catch(() => {})
    else await navigator.clipboard?.writeText(window.location.href)
    setTimeout(() => setShared(false), 1800)
  }
  return (
    <>
      <Header />
      <main className="event-page">
        <section className="event-visual shell">
          <Image
            src={event.image}
            alt={`${event.title} event atmosphere`}
            width={1400}
            height={850}
          />
          <div className="event-visual-tag">{event.category}</div>
        </section>
        <section className="event-info shell">
          <div className="event-copy">
            <div className="event-kicker">
              <span>{event.shortDate}</span>
              <button onClick={share}>
                <Icon name="share" size={18} /> {shared ? 'Link copied' : 'Share event'}
              </button>
            </div>
            <h1>{event.title}</h1>
            <p className="hosted">
              Hosted by <strong>{event.host}</strong>
            </p>
            <div className="event-facts">
              <div>
                <Icon name="calendar" />
                <span>
                  <b>Date & time</b>
                  {event.date}
                </span>
              </div>
              <div>
                <Icon name="pin" />
                <span>
                  <b>Location</b>
                  {event.location}, {event.city}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(event.location + ' ' + event.city)}`}
                    target="_blank"
                  >
                    View map
                  </a>
                </span>
              </div>
            </div>
            <div className="about">
              <h2>About this event</h2>
              <p>
                {event.description ||
                  `An immersive gathering of sound, style and community in ${event.city}.`}
              </p>
              <p>
                Doors open one hour before the event. Entry is subject to a valid AZOR TIX QR code
                and government-issued identification.
              </p>
            </div>
          </div>
          <aside className="ticket-panel">
            <span className="eyebrow">Choose your ticket</span>
            {ticketTypes.map((ticket) => (
              <button
                type="button"
                className={`ticket-choice ticket-option ${ticket.id === selectedTicket?.id ? 'selected' : ''}`}
                key={ticket.id}
                onClick={() => {
                  setTicketTypeId(ticket.id)
                  setQty(1)
                }}
              >
                <div>
                  <h3>{ticket.name}</h3>
                  <p>{ticket.description}</p>
                  <b>{formatMoney(ticket.price)}</b>
                </div>
                <span>{ticket.id === selectedTicket?.id ? 'Selected' : 'Choose'}</span>
              </button>
            ))}
            <div className="quantity ticket-quantity">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>
                <Icon name="minus" size={16} />
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty(Math.min(selectedTicket?.maxPerOrder || 8, qty + 1))}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <div className="price-line">
              <span>Subtotal</span>
              <b>{formatMoney((selectedTicket?.price || 0) * qty)}</b>
            </div>
            <LinkButton
              to={`/checkout/${event.id}?qty=${qty}&ticket=${selectedTicket?.id || ''}`}
              className="button button-dark full"
            >
              Get tickets <Icon name="arrow" />
            </LinkButton>
            <small>Secure checkout · Instant confirmation</small>
          </aside>
        </section>
        <section className="more-events shell">
          <div className="section-heading">
            <h2>
              You may also <em>like</em>
            </h2>
            <LinkButton to="/discover" className="text-link">
              Explore all <Icon name="arrow" />
            </LinkButton>
          </div>
          <div className="event-grid">
            {events
              .filter((e) => e.id !== event.id)
              .slice(0, 3)
              .map((e) => (
                <EventCard event={e} key={e.id} />
              ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function CheckoutPage({ event }: { event: EventItem }) {
  const [qty, setQty] = useState(1)
  const [ticketTypeId, setTicketTypeId] = useState(event.ticketTypeId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = Number(params.get('qty')) || 1
    setQty(Math.max(1, Math.min(8, requested)))
    setTicketTypeId(params.get('ticket') || event.ticketTypeId)
  }, [event.ticketTypeId])
  const selectedTicket =
    event.ticketTypes?.find((ticket) => ticket.id === ticketTypeId) || event.ticketTypes?.[0]
  const ticketPrice = selectedTicket?.price || event.price
  const fee = Math.round(ticketPrice * qty * 0.02)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventSlug: event.id,
        ticketTypeId: selectedTicket?.id,
        quantity: qty,
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        email: form.get('email'),
        phone: form.get('phone'),
        discountCode: form.get('discountCode'),
        attendeeAnswers: (event.attendeeQuestions || []).map((question, index) => ({
          question: question.label,
          answer: String(form.get(`question-${index}`) || ''),
        })),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Checkout could not be started.')
      setSubmitting(false)
      return
    }
    window.location.assign(result.authorizationURL)
  }
  return (
    <>
      <Header />
      <main className="checkout-page shell">
        <div className="checkout-form">
          <LinkButton to={`/events/${event.id}`} className="back-link">
            ← Back to event
          </LinkButton>
          <span className="eyebrow">Secure checkout</span>
          <h1>
            Almost <em>there.</em>
          </h1>
          <form onSubmit={submit}>
            <section>
              <div className="form-section-head">
                <span>01</span>
                <h2>Your details</h2>
              </div>
              <div className="form-grid">
                <label>
                  First name
                  <input name="firstName" required minLength={2} placeholder="Amara" />
                </label>
                <label>
                  Last name
                  <input name="lastName" required minLength={2} placeholder="Okafor" />
                </label>
                <label className="wide">
                  Email address
                  <input name="email" type="email" required placeholder="amara@example.com" />
                </label>
                <label className="wide">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    required
                    pattern="^\+?[0-9 ]{10,16}$"
                    placeholder="+234 800 000 0000"
                  />
                </label>
                {(event.attendeeQuestions || []).map((question, index) => (
                  <label className="wide" key={`${question.label}-${index}`}>
                    {question.label}
                    {question.type === 'multiple-choice' ? (
                      <select name={`question-${index}`} required={question.required}>
                        <option value="">Choose an option</option>
                        {(question.options || []).map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : question.type === 'checkbox' ? (
                      <select name={`question-${index}`} required={question.required}>
                        <option value="">Choose</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <input
                        name={`question-${index}`}
                        type={question.type === 'date' ? 'date' : 'text'}
                        required={question.required}
                      />
                    )}
                  </label>
                ))}
                <label className="wide">
                  Discount code <span className="optional">Optional</span>
                  <input name="discountCode" autoCapitalize="characters" />
                </label>
              </div>
            </section>
            <section>
              <div className="form-section-head">
                <span>02</span>
                <h2>Payment</h2>
              </div>
              <div className="payment-choice">
                <div>
                  <b>Pay securely by card</b>
                  <span>VISA · mastercard · verve</span>
                </div>
                <Icon name="check" />
              </div>
              <p className="payment-note">
                You will enter card or bank details on Paystack’s secure payment page. AZOR TIX
                never stores your payment credentials.
              </p>
            </section>
            <label className="terms">
              <input type="checkbox" required />{' '}
              <span>
                I agree to the AZOR TIX terms and refund policy
                {event.refundPolicy ? `: ${event.refundPolicy}` : '.'}
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-dark full" type="submit" disabled={submitting}>
              {submitting
                ? 'Connecting to Paystack…'
                : `Pay ${formatMoney(ticketPrice * qty + fee)}`}
              {!submitting && <Icon name="arrow" />}
            </button>
          </form>
        </div>
        <aside className="order-summary">
          <span className="eyebrow">Your order</span>
          <Image src={event.image} alt={event.title} width={760} height={480} />
          <h2>{event.title}</h2>
          <p>{event.date}</p>
          <p>
            {event.location}, {event.city}
          </p>
          <hr />
          <div>
            <span>
              {selectedTicket?.name || 'Ticket'} × {qty}
            </span>
            <b>{formatMoney(ticketPrice * qty)}</b>
          </div>
          <div>
            <span>Service fee</span>
            <b>{formatMoney(fee)}</b>
          </div>
          <hr />
          <div className="total">
            <span>Total</span>
            <b>{formatMoney(ticketPrice * qty + fee)}</b>
          </div>
        </aside>
      </main>
    </>
  )
}

function OrganizersPage() {
  const [openFaq, setOpenFaq] = useState(0)
  const faqs = [
    [
      'How quickly can I start selling?',
      'In minutes. Create your event, add ticket types, connect your settlement details and publish when you are ready.',
    ],
    [
      'How do payouts work?',
      'Your balance is tracked in real time and settled securely to your verified bank account after the event.',
    ],
    [
      'Can I manage check-in at the door?',
      'Yes. Your team can validate QR tickets from any modern phone, with a live attendance count.',
    ],
    [
      'What kinds of events can I host?',
      'From intimate dinners to arena shows—if people need a ticket, AZOR TIX can help you welcome them.',
    ],
  ]
  return (
    <>
      <Header dark />
      <main className="organizers-page">
        <section className="org-hero">
          <div className="shell">
            <span className="eyebrow light">Ticketing that keeps up</span>
            <h1>
              Build the room
              <br />
              everyone <em>wants in.</em>
            </h1>
            <p>
              Beautiful event pages, effortless sales and the insights to make every event better
              than the last.
            </p>
            <a href="#start" className="button button-coral">
              Create your event <Icon name="arrow" />
            </a>
            <div className="org-stats">
              <div>
                <b>10 min</b>
                <span>to go live</span>
              </div>
              <div>
                <b>24/7</b>
                <span>sales visibility</span>
              </div>
              <div>
                <b>100%</b>
                <span>your audience</span>
              </div>
            </div>
          </div>
        </section>
        <section className="org-intro shell">
          <div>
            <span className="eyebrow">Everything in one place</span>
            <h2>
              Less admin.
              <br />
              <em>More atmosphere.</em>
            </h2>
          </div>
          <p>
            We obsess over the ticketing so you can obsess over the experience. From first
            announcement to final scan, every tool is clear, fast and made to work.
          </p>
        </section>
        <section className="feature-grid shell">
          {[
            [
              'Sell beautifully',
              'Create a polished, mobile-first page that feels like your event—not a checkout form.',
              '01',
            ],
            [
              'Know your crowd',
              'See sales, traffic and audience insights in real time, without fighting a spreadsheet.',
              '02',
            ],
            [
              'Check in calmly',
              'Scan guests quickly, manage your door team and follow attendance as it happens.',
              '03',
            ],
            [
              'Grow every time',
              'Stay connected with past attendees and turn one good night into a loyal community.',
              '04',
            ],
          ].map(([title, body, n]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <Icon name="arrow" />
            </article>
          ))}
        </section>
        <section className="quote-section">
          <div className="quote-image">
            <Image
              src="https://images.unsplash.com/photo-1661335908621-3efb9761bbaf?auto=format&fit=crop&w=1200&q=85"
              alt="Audience enjoying a live show"
              width={1200}
              height={900}
            />
          </div>
          <blockquote>
            <span>“</span>
            <p>
              AZOR gives us one less thing to worry about. Our pages look good, our guests move
              faster, and the numbers finally make sense.
            </p>
            <footer>— NANA EZE, HOUSE OF WAVES</footer>
          </blockquote>
        </section>
        <section className="faq shell">
          <div>
            <span className="eyebrow">Good to know</span>
            <h2>
              Questions,
              <br />
              <em>answered.</em>
            </h2>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => (
              <button
                key={q}
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className={openFaq === i ? 'open' : ''}
              >
                <span>
                  <b>{q}</b>
                  <Icon name={openFaq === i ? 'minus' : 'plus'} />
                </span>
                <p>{a}</p>
              </button>
            ))}
          </div>
        </section>
        <section id="start" className="org-cta shell">
          <span className="eyebrow light">Ready when you are</span>
          <h2>
            Make something
            <br />
            <em>people remember.</em>
          </h2>
          <p>Join Abuja’s new generation of event creators.</p>
          <LinkButton to="/register" className="button button-coral">
            Start creating for free <Icon name="arrow" />
          </LinkButton>
        </section>
      </main>
      <Footer />
    </>
  )
}

function NotFound() {
  return (
    <>
      <Header />
      <main className="not-found shell">
        <span>404</span>
        <h1>
          Wrong turn.
          <br />
          <em>Good taste.</em>
        </h1>
        <p>That page has left the venue.</p>
        <LinkButton to="/" className="button button-dark">
          Back home <Icon name="arrow" />
        </LinkButton>
      </main>
      <Footer />
    </>
  )
}

export default function AzorSite({
  events,
  initialPath,
}: {
  events: EventItem[]
  initialPath: string
}) {
  const path = initialPath
  if (path === '/') return <HomePage events={events} />
  if (path === '/discover') return <DiscoverPage events={events} />
  if (path === '/organizers') return <OrganizersPage />
  if (path.startsWith('/events/')) {
    const event = events.find((e) => e.id === path.split('/')[2])
    return event ? <EventPage event={event} events={events} /> : <NotFound />
  }
  if (path.startsWith('/checkout/')) {
    const event = events.find((e) => e.id === path.split('/')[2])
    return event ? <CheckoutPage event={event} /> : <NotFound />
  }
  return <NotFound />
}
