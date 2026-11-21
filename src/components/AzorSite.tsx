'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

import { formatNaira, formatNumber } from '@/lib/format'
import { BrandLogo } from './BrandLogo'

export type EventItem = {
  id: string
  slug?: string
  title: string
  date: string
  formattedTime?: string
  startsAtISO?: string
  endsAtISO?: string
  shortDate: string
  location: string
  address?: string
  city: string
  category: string
  eventFormat?: string
  virtualLink?: string
  price: number
  image: string
  host: string
  shortDescription?: string
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
    ticketKind?: 'paid' | 'free'
    description?: string
    price: number
    quantity?: number
    sold?: number
    remaining?: number
    minPerOrder?: number
    maxPerOrder: number
    ticketMode?: 'single' | 'group'
    groupSize?: number
    soldOut?: boolean
    outsideWindow?: boolean
  }[]
}

export type PublicUserProfile = {
  name?: string
  email?: string
  phone?: string
  role?: 'organizer' | 'admin' | 'super-admin' | string
  dashboardUrl?: string
} | null

const formatMoney = (value: number) => (value === 0 ? 'Free (₦0)' : formatNaira(value))

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

function Logo({ light = false, homepageWhite = false }: { light?: boolean; homepageWhite?: boolean }) {
  return <BrandLogo light={light} variant={homepageWhite ? 'homepage-white' : 'default'} />
}

function Header({
  dark = false,
  homepageWhite = false,
  currentUser = null,
}: {
  dark?: boolean
  homepageWhite?: boolean
  currentUser?: PublicUserProfile
}) {
  const [open, setOpen] = useState(false)

  return (
    <header className={`header ${dark ? 'header-dark' : ''}`}>
      <div className="nav-shell">
        <Logo light={dark} homepageWhite={homepageWhite} />
        <nav className={open ? 'nav-open' : ''}>
          <LinkButton to="/discover">Discover events</LinkButton>
          <LinkButton to="/organizers">For organizers</LinkButton>
          {currentUser?.dashboardUrl ? (
            <LinkButton to={currentUser.dashboardUrl} className="button button-small">
              ← Back to Dashboard
            </LinkButton>
          ) : (
            <>
              <LinkButton to="/login" className="nav-login">
                Log in
              </LinkButton>
              <LinkButton to="/register" className="button button-small">
                Create event <Icon name="arrow" size={16} />
              </LinkButton>
            </>
          )}
        </nav>
        <button
          type="button"
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
        <span>© 2026 AZORTIX. Made for Abuja.</span>
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
          <strong>{event.price === 0 ? 'Free entry' : `From ₦${formatNumber(event.price)}`}</strong>
        </div>
      </div>
    </LinkButton>
  )
}

function HomePage({
  events,
  currentUser,
}: {
  events: EventItem[]
  currentUser?: PublicUserProfile
}) {
  return (
    <>
      <div className="home-hero-wrap">
        <Header dark homepageWhite currentUser={currentUser} />
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
          {events.length > 0 ? (
            <div className="event-grid">
              {events.slice(0, 3).map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <div className="empty empty-home">
              <Icon name="calendar" size={32} />
              <h3>No public events live yet</h3>
              <p>Fresh Abuja concerts, parties, and conferences appear here as soon as organizers publish.</p>
              <LinkButton to="/register" className="button button-dark">
                Host an event <Icon name="arrow" size={16} />
              </LinkButton>
            </div>
          )}
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
              <small>ABUJA · 2026</small>
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

function DiscoverPage({
  events,
  currentUser,
}: {
  events: EventItem[]
  currentUser?: PublicUserProfile
}) {
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
    [events, query, category],
  )
  return (
    <>
      <Header currentUser={currentUser} />
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

function EventPage({
  event,
  events,
  currentUser,
}: {
  event: EventItem
  events: EventItem[]
  currentUser?: PublicUserProfile
}) {
  const ticketTypes = event.ticketTypes || []
  const firstAvailable = ticketTypes.find((t) => !t.soldOut && !t.outsideWindow) || ticketTypes[0]
  const [ticketTypeId, setTicketTypeId] = useState(firstAvailable?.id || event.ticketTypeId)
  const [purchaseMode, setPurchaseMode] = useState<'self' | 'gift'>('self')
  const [qty, setQty] = useState(Math.max(1, firstAvailable?.minPerOrder || 1))
  const [shared, setShared] = useState(false)
  const selectedTicket = ticketTypes.find((ticket) => ticket.id === ticketTypeId) || firstAvailable
  const minQty = Math.max(1, selectedTicket?.minPerOrder || 1)
  const maxQty = Math.max(
    minQty,
    Math.min(
      selectedTicket?.maxPerOrder || 8,
      typeof selectedTicket?.remaining === 'number' ? Math.max(1, selectedTicket.remaining) : 8,
    ),
  )
  const canCheckout = Boolean(selectedTicket && !selectedTicket.soldOut && !selectedTicket.outsideWindow)

  const share = async () => {
    setShared(true)
    if (navigator.share) {
      await navigator.share({ title: event.title, url: window.location.href }).catch(() => {
        navigator.clipboard?.writeText(window.location.href)
      })
    } else {
      await navigator.clipboard?.writeText(window.location.href)
    }
    setTimeout(() => setShared(false), 1800)
  }
  return (
    <>
      <Header currentUser={currentUser} />
      <main className="event-page">
        <section className="event-visual shell">
          <Image
            src={event.image}
            alt={`${event.title} event atmosphere`}
            width={1400}
            height={850}
            referrerPolicy="no-referrer"
          />
          <div className="event-visual-tag">{event.category}</div>
        </section>
        <section className="event-info shell">
          <div className="event-copy">
            <div className="event-kicker">
              <span>{event.shortDate}</span>
              <button type="button" onClick={share}>
                <Icon name="share" size={18} /> {shared ? 'Link copied' : 'Share event'}
              </button>
            </div>
            <h1>{event.title}</h1>
            <p className="hosted">
              Hosted by <strong>{event.host}</strong>
            </p>
            {event.shortDescription && <p className="section-copy">{event.shortDescription}</p>}
            <div className="event-facts">
              <div>
                <Icon name="calendar" />
                <span>
                  <b>Date &amp; time</b>
                  {event.date}
                  {event.formattedTime ? ` · ${event.formattedTime} WAT` : ''}
                </span>
              </div>
              <div>
                <Icon name="pin" />
                <span>
                  <b>{event.eventFormat === 'virtual' ? 'Online event' : 'Location'}</b>
                  {event.location}
                  {event.address ? `, ${event.address}` : ''}, {event.city}
                  {event.eventFormat !== 'virtual' && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        `${event.location} ${event.address || ''} ${event.city}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View map
                    </a>
                  )}
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
                Doors open one hour before the event. Entry is subject to a valid AZORTIX QR code
                and government-issued identification.
              </p>
            </div>
          </div>
          <aside className="ticket-panel">
            <span className="eyebrow">Choose your ticket</span>
            {ticketTypes.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 my-2">
                <p className="font-semibold text-neutral-900 mb-1">
                  Public ticket sales are not open yet
                </p>
                <p className="m-0">
                  The organizer has not published public ticket categories for this event yet.
                </p>
              </div>
            ) : (
              <>
                {ticketTypes.map((ticket) => {
                  const unavailable = Boolean(ticket.soldOut || ticket.outsideWindow)
                  return (
                    <button
                      type="button"
                      disabled={unavailable}
                      className={`ticket-choice ticket-option ${ticket.id === selectedTicket?.id ? 'selected' : ''}`}
                      key={ticket.id}
                      onClick={() => {
                        setTicketTypeId(ticket.id)
                        setQty(Math.max(1, ticket.minPerOrder || 1))
                      }}
                    >
                      <div>
                        <h3>{ticket.name}</h3>
                        {ticket.description && <p>{ticket.description}</p>}
                        <b>{formatMoney(ticket.price)}</b>
                        <small className="block text-xs text-neutral-500 mt-0.5">
                          {ticket.soldOut
                            ? 'Sold out'
                            : ticket.outsideWindow
                              ? 'Sales window closed'
                              : typeof ticket.remaining === 'number'
                                ? `${ticket.remaining} remaining${
                                    ticket.ticketMode === 'group' && ticket.groupSize
                                      ? ` · Admits ${ticket.groupSize}`
                                      : ''
                                  }`
                                : ''}
                        </small>
                      </div>
                      <span>
                        {ticket.soldOut
                          ? 'Sold out'
                          : ticket.outsideWindow
                            ? 'Closed'
                            : ticket.id === selectedTicket?.id
                              ? 'Selected'
                              : 'Choose'}
                      </span>
                    </button>
                  )
                })}

                <div className="my-3">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-1.5">
                    Who are you buying this ticket for?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPurchaseMode('self')}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        purchaseMode === 'self'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900'
                      }`}
                    >
                      Buy for myself
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseMode('gift')}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        purchaseMode === 'gift'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900'
                      }`}
                    >
                      Buy as a gift
                    </button>
                  </div>
                </div>

                <div className="quantity ticket-quantity">
                  <button
                    type="button"
                    disabled={!canCheckout || qty <= minQty}
                    onClick={() => setQty(Math.max(minQty, qty - 1))}
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span>{qty}</span>
                  <button
                    type="button"
                    disabled={!canCheckout || qty >= maxQty}
                    onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
                <div className="price-line">
                  <span>Subtotal</span>
                  <b>{formatMoney((selectedTicket?.price || 0) * qty)}</b>
                </div>
                {canCheckout ? (
                  <LinkButton
                    to={`/checkout/${event.id}?qty=${qty}&ticket=${selectedTicket?.id || ''}&mode=${purchaseMode}`}
                    className="button button-dark full"
                  >
                    {purchaseMode === 'gift'
                      ? 'Continue to Gift Checkout'
                      : (selectedTicket?.price || 0) === 0
                        ? 'Register for free'
                        : 'Get tickets'}{' '}
                    <Icon name="arrow" />
                  </LinkButton>
                ) : (
                  <button type="button" disabled className="button button-dark full opacity-60">
                    Unavailable
                  </button>
                )}
                <small>
                  {purchaseMode === 'gift'
                    ? 'Individual QR passes emailed directly to each recipient · You can also mix tickets for yourself & gifts at checkout'
                    : (selectedTicket?.price || 0) === 0
                      ? 'Free registration · Instant QR ticket · Mix self & gift tickets at checkout'
                      : 'Secure Paystack checkout · Mix tickets for yourself & gifts in one order'}
                </small>
              </>
            )}
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

interface TicketSlotAssignment {
  assignmentType: 'self' | 'gift'
  recipientName: string
  recipientEmail: string
  giftMessage: string
}

function CheckoutPage({
  event,
  currentUser,
}: {
  event: EventItem
  currentUser?: PublicUserProfile
}) {
  const availableTypes = useMemo(() => event.ticketTypes || [], [event.ticketTypes])
  const firstAvailable = useMemo(
    () => availableTypes.find((t) => !t.soldOut && !t.outsideWindow) || availableTypes[0],
    [availableTypes],
  )

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (!firstAvailable) return {}
    return { [firstAvailable.id]: Math.max(1, firstAvailable.minPerOrder || 1) }
  })
  const [defaultAssignmentMode, setDefaultAssignmentMode] = useState<'self' | 'gift'>('self')
  const [slotAssignments, setSlotAssignments] = useState<Record<string, TicketSlotAssignment>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramTicketId = params.get('ticket') || firstAvailable?.id || event.ticketTypeId || ''
    const matched =
      availableTypes.find((t) => t.id === paramTicketId && !t.soldOut && !t.outsideWindow) ||
      firstAvailable
    const requestedQty = Number(params.get('qty')) || 1
    const mode = params.get('mode') === 'gift' ? 'gift' : 'self'
    setDefaultAssignmentMode(mode)

    if (matched) {
      const minQ = Math.max(1, matched.minPerOrder || 1)
      const maxQ = Math.max(
        minQ,
        Math.min(
          matched.maxPerOrder || 8,
          typeof matched.remaining === 'number' ? Math.max(1, matched.remaining) : 8,
        ),
      )
      const clamped = Math.max(minQ, Math.min(maxQ, requestedQty))
      setQuantities({ [matched.id]: clamped })
    }
  }, [availableTypes, event.ticketTypeId, firstAvailable])

  // Expand selected line items into individual ticket slots
  const expandedSlots = useMemo(() => {
    const slots: Array<{
      slotKey: string
      ticketTypeId: string
      ticketName: string
      unitPrice: number
      indexInType: number
    }> = []
    for (const ticket of availableTypes) {
      const count = quantities[ticket.id] || 0
      for (let i = 0; i < count; i += 1) {
        slots.push({
          slotKey: `${ticket.id}:${i}`,
          ticketTypeId: ticket.id,
          ticketName: ticket.name,
          unitPrice: ticket.price,
          indexInType: i,
        })
      }
    }
    return slots
  }, [availableTypes, quantities])

  const getSlotAssignment = (slotKey: string): TicketSlotAssignment => {
    return (
      slotAssignments[slotKey] || {
        assignmentType: defaultAssignmentMode,
        recipientName: '',
        recipientEmail: '',
        giftMessage: '',
      }
    )
  }

  const updateSlot = (slotKey: string, patch: Partial<TicketSlotAssignment>) => {
    setSlotAssignments((prev) => {
      const current = prev[slotKey] || {
        assignmentType: defaultAssignmentMode,
        recipientName: '',
        recipientEmail: '',
        giftMessage: '',
      }
      return { ...prev, [slotKey]: { ...current, ...patch } }
    })
  }

  const setAllSlotsMode = (mode: 'self' | 'gift') => {
    setDefaultAssignmentMode(mode)
    setSlotAssignments((prev) => {
      const next: Record<string, TicketSlotAssignment> = { ...prev }
      for (const slot of expandedSlots) {
        const current = next[slot.slotKey] || {
          assignmentType: mode,
          recipientName: '',
          recipientEmail: '',
          giftMessage: '',
        }
        next[slot.slotKey] = { ...current, assignmentType: mode }
      }
      return next
    })
  }

  const copyFromPreviousGift = (slotIdx: number) => {
    for (let i = slotIdx - 1; i >= 0; i -= 1) {
      const prevAssignment = getSlotAssignment(expandedSlots[i].slotKey)
      if (prevAssignment.assignmentType === 'gift' && prevAssignment.recipientName.trim()) {
        updateSlot(expandedSlots[slotIdx].slotKey, {
          assignmentType: 'gift',
          recipientName: prevAssignment.recipientName,
          recipientEmail: prevAssignment.recipientEmail,
          giftMessage: prevAssignment.giftMessage,
        })
        return
      }
    }
  }

  const totalQty = expandedSlots.length
  const subtotal = expandedSlots.reduce((sum, s) => sum + Number(s.unitPrice || 0), 0)
  const fee = subtotal > 0 ? Math.round(subtotal * 0.02) : 0
  const grandTotal = subtotal + fee

  const resolvedSlots = expandedSlots.map((slot) => ({
    ...slot,
    assignment: getSlotAssignment(slot.slotKey),
  }))
  const selfCount = resolvedSlots.filter((s) => s.assignment.assignmentType === 'self').length
  const giftCount = resolvedSlots.filter((s) => s.assignment.assignmentType === 'gift').length
  const computedPurchaseMode: 'self' | 'gift' | 'mixed' =
    giftCount === 0 ? 'self' : selfCount === 0 ? 'gift' : 'mixed'

  const buyerFullName = `${firstName} ${lastName}`.trim()

  const adjustCategoryQuantity = (ticket: NonNullable<EventItem['ticketTypes']>[number], delta: number) => {
    const current = quantities[ticket.id] || 0
    const minOrder = Math.max(1, ticket.minPerOrder || 1)
    const maxOrder = Math.max(
      minOrder,
      Math.min(
        ticket.maxPerOrder || 8,
        typeof ticket.remaining === 'number' ? Math.max(0, ticket.remaining) : 8,
      ),
    )

    let next = current + delta
    if (delta > 0 && current === 0) {
      next = minOrder
    } else if (delta < 0 && next < minOrder) {
      next = 0
    }
    next = Math.max(0, Math.min(maxOrder, next))

    const otherTotal = Object.entries(quantities).reduce(
      (sum, [id, q]) => (id === ticket.id ? sum : sum + q),
      0,
    )
    if (otherTotal + next > 20) return
    setQuantities((prev) => ({ ...prev, [ticket.id]: next }))
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (totalQty < 1) {
      setError('Select at least one ticket before proceeding to payment.')
      return
    }

    for (let i = 0; i < resolvedSlots.length; i += 1) {
      const { assignment, ticketName } = resolvedSlots[i]
      if (assignment.assignmentType === 'gift') {
        if (assignment.recipientName.trim().length < 2 || !assignment.recipientEmail.includes('@')) {
          setError(
            `Enter a valid recipient full name and email address for Ticket #${i + 1} (${ticketName} · Gift).`,
          )
          return
        }
      }
    }

    const lineItems = availableTypes
      .map((t) => ({ ticketTypeId: t.id, quantity: quantities[t.id] || 0 }))
      .filter((item) => item.quantity > 0)

    setSubmitting(true)
    try {
      const form = new FormData(e.currentTarget)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: event.id,
          items: lineItems,
          purchaseMode: computedPurchaseMode,
          ticketAssignments: resolvedSlots.map(({ ticketTypeId, assignment }) => ({
            assignmentType: assignment.assignmentType,
            ticketTypeId,
            ...(assignment.assignmentType === 'gift'
              ? {
                  recipientName: assignment.recipientName.trim(),
                  recipientEmail: assignment.recipientEmail.trim().toLowerCase(),
                  giftMessage: assignment.giftMessage.trim(),
                }
              : {
                  recipientName: buyerFullName,
                  recipientEmail: email.trim().toLowerCase(),
                }),
          })),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          discountCode: form.get('discountCode'),
          attendeeAnswers: (event.attendeeQuestions || []).map((question, index) => ({
            question: question.label,
            answer: String(form.get(`question-${index}`) || ''),
          })),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Checkout could not be started.')
        setSubmitting(false)
        return
      }
      window.location.assign(result.authorizationURL)
    } catch {
      setError('Unable to reach checkout right now. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header currentUser={currentUser} />
      <main className="checkout-page shell">
        <div className="checkout-form">
          <LinkButton to={`/events/${event.id}`} className="back-link">
            ← Back to event
          </LinkButton>
          <span className="eyebrow">Secure AZORTIX checkout</span>
          <h1>
            Almost <em>there.</em>
          </h1>
          <form onSubmit={submit} autoComplete="off">
            {/* Step 01: Ticket Selection (supports multiple categories & quantities in ONE order) */}
            <section>
              <div className="form-section-head">
                <span>01</span>
                <h2>Select your tickets</h2>
              </div>
              <p className="text-xs text-neutral-600 mb-3">
                Choose one or more ticket categories. In Step 03 you can keep tickets for yourself,
                gift them to friends, or mix both in a single payment.
              </p>
              <div className="space-y-2.5">
                {availableTypes.map((ticket) => {
                  const unavailable = Boolean(ticket.soldOut || ticket.outsideWindow)
                  const count = quantities[ticket.id] || 0
                  const maxOrder = Math.min(
                    ticket.maxPerOrder || 8,
                    typeof ticket.remaining === 'number' ? Math.max(0, ticket.remaining) : 8,
                  )
                  return (
                    <div
                      key={ticket.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                        count > 0
                          ? 'border-neutral-950 bg-neutral-50'
                          : 'border-neutral-200 bg-white'
                      } ${unavailable ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold text-neutral-950">
                          {ticket.name}
                        </strong>
                        {ticket.description && (
                          <p className="text-xs text-neutral-500 m-0 mt-0.5">{ticket.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="font-bold text-neutral-900">
                            {formatMoney(ticket.price)}
                          </span>
                          <span className="text-neutral-500">
                            {ticket.soldOut
                              ? '· Sold out'
                              : ticket.outsideWindow
                                ? '· Sales closed'
                                : typeof ticket.remaining === 'number'
                                  ? `· ${ticket.remaining} left`
                                  : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={`Decrease ${ticket.name}`}
                          disabled={unavailable || count <= 0}
                          onClick={() => adjustCategoryQuantity(ticket, -1)}
                          className="h-8 w-8 rounded-lg border border-neutral-300 bg-white flex items-center justify-center text-neutral-900 disabled:opacity-40"
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-neutral-950">
                          {count}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${ticket.name}`}
                          disabled={unavailable || count >= maxOrder || totalQty >= 20}
                          onClick={() => adjustCategoryQuantity(ticket, 1)}
                          className="h-8 w-8 rounded-lg border border-neutral-300 bg-white flex items-center justify-center text-neutral-900 disabled:opacity-40"
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Step 02: Purchaser / Buyer Details */}
            <section>
              <div className="form-section-head">
                <span>02</span>
                <h2>Your details (Buyer / Purchaser)</h2>
              </div>
              <div className="form-grid">
                <label>
                  First name
                  <input
                    name="firstName"
                    required
                    minLength={2}
                    autoComplete="off"
                    placeholder="Amara"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    required
                    minLength={2}
                    autoComplete="off"
                    placeholder="Okafor"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
                <label className="wide">
                  Email address{' '}
                  <span className="optional">
                    (receives your order confirmation{selfCount > 0 ? ' & your own tickets' : ''})
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="amara@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="wide">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="off"
                    pattern="^\+?[0-9 ]{10,16}$"
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                        autoComplete="off"
                        required={question.required}
                      />
                    )}
                  </label>
                ))}
                <label className="wide">
                  Discount code <span className="optional">Optional</span>
                  <input name="discountCode" autoCapitalize="characters" autoComplete="off" />
                </label>
              </div>
            </section>

            {/* Step 03: Assign Each Ticket Individually (Self vs Gift — mix freely in one order!) */}
            <section>
              <div className="form-section-head">
                <span>03</span>
                <h2>
                  Assign each ticket ({totalQty} {totalQty === 1 ? 'ticket' : 'tickets'})
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="text-xs text-neutral-600 m-0">
                  Assign each ticket to yourself or gift it to someone else. Gifted tickets are
                  emailed directly to each recipient with zero payment details.
                </p>
                {totalQty > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAllSlotsMode('self')}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        computedPurchaseMode === 'self'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900'
                      }`}
                    >
                      All for myself
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllSlotsMode('gift')}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        computedPurchaseMode === 'gift'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900'
                      }`}
                    >
                      All as gifts
                    </button>
                  </div>
                )}
              </div>

              {totalQty === 0 ? (
                <p className="text-sm text-neutral-500">
                  Select at least one ticket above to assign attendee details.
                </p>
              ) : (
                <div className="space-y-3">
                  {resolvedSlots.map(({ slotKey, ticketName, unitPrice, assignment }, idx) => {
                    const isGift = assignment.assignmentType === 'gift'
                    const hasEarlierGift = resolvedSlots
                      .slice(0, idx)
                      .some(
                        (prev) =>
                          prev.assignment.assignmentType === 'gift' &&
                          prev.assignment.recipientName.trim().length > 0,
                      )
                    return (
                      <div
                        key={slotKey}
                        className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 m-0">
                            Ticket #{idx + 1} · {ticketName} ({formatMoney(unitPrice)})
                          </p>
                          <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => updateSlot(slotKey, { assignmentType: 'self' })}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                !isGift
                                  ? 'bg-neutral-950 text-white'
                                  : 'text-neutral-700 hover:text-neutral-950'
                              }`}
                            >
                              Buy for myself
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSlot(slotKey, { assignmentType: 'gift' })}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                isGift
                                  ? 'bg-neutral-950 text-white'
                                  : 'text-neutral-700 hover:text-neutral-950'
                              }`}
                            >
                              Gift to someone
                            </button>
                          </div>
                        </div>

                        {!isGift ? (
                          <div className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-700">
                            <strong className="text-neutral-950">Assigned to you:</strong>{' '}
                            {buyerFullName || 'Enter your name in Step 02'}
                            {email ? ` (${email})` : ''} — unique QR pass will be emailed to your
                            address.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {hasEarlierGift && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => copyFromPreviousGift(idx)}
                                  className="text-xs font-semibold underline text-neutral-800"
                                >
                                  Copy details from previous gift
                                </button>
                              </div>
                            )}
                            <div className="form-grid">
                              <label>
                                Recipient full name
                                <input
                                  required
                                  minLength={2}
                                  autoComplete="off"
                                  placeholder="Chidi Nwosu"
                                  value={assignment.recipientName}
                                  onChange={(e) =>
                                    updateSlot(slotKey, { recipientName: e.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Recipient email address
                                <input
                                  type="email"
                                  required
                                  autoComplete="off"
                                  placeholder="chidi@example.com"
                                  value={assignment.recipientEmail}
                                  onChange={(e) =>
                                    updateSlot(slotKey, { recipientEmail: e.target.value })
                                  }
                                />
                              </label>
                              <label className="wide">
                                Personal gift message <span className="optional">Optional</span>
                                <input
                                  maxLength={240}
                                  autoComplete="off"
                                  placeholder="Happy birthday! Enjoy the show in Abuja."
                                  value={assignment.giftMessage}
                                  onChange={(e) =>
                                    updateSlot(slotKey, { giftMessage: e.target.value })
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Step 04: Single Payment */}
            <section>
              <div className="form-section-head">
                <span>04</span>
                <h2>{grandTotal === 0 ? 'Free registration' : 'Payment'}</h2>
              </div>
              {grandTotal === 0 ? (
                <div className="payment-choice">
                  <div>
                    <b>Free Ticket (₦0)</b>
                    <span>NO CARD REQUIRED · INSTANT QR TICKETS</span>
                  </div>
                  <Icon name="check" />
                </div>
              ) : (
                <>
                  <div className="payment-choice">
                    <div>
                      <b>Pay securely by card or transfer</b>
                      <span>VISA · MASTERCARD · VERVE · PAYSTACK</span>
                    </div>
                    <Icon name="check" />
                  </div>
                  <p className="payment-note">
                    You will complete one single payment on Paystack&apos;s secure checkout page for
                    all {totalQty} {totalQty === 1 ? 'ticket' : 'tickets'}. AZORTIX never stores
                    your payment credentials.
                  </p>
                </>
              )}
            </section>

            <label className="terms">
              <input type="checkbox" required />{' '}
              <span>
                I agree to the AZORTIX terms and refund policy
                {event.refundPolicy ? `: ${event.refundPolicy}` : '.'}
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-dark full"
              type="submit"
              disabled={submitting || totalQty < 1}
            >
              {submitting
                ? grandTotal === 0
                  ? 'Confirming registration…'
                  : 'Connecting to Paystack…'
                : grandTotal === 0
                  ? computedPurchaseMode === 'mixed'
                    ? 'Confirm Tickets & Send Gifts'
                    : computedPurchaseMode === 'gift'
                      ? 'Send Free Gift Tickets'
                      : 'Complete Free Registration'
                  : computedPurchaseMode === 'mixed'
                    ? `Pay ${formatMoney(grandTotal)} (Your Tickets + Gifts)`
                    : computedPurchaseMode === 'gift'
                      ? `Pay ${formatMoney(grandTotal)} & Send Gift`
                      : `Pay ${formatMoney(grandTotal)}`}
              {!submitting && <Icon name="arrow" />}
            </button>
          </form>
        </div>

        <aside className="order-summary">
          <span className="eyebrow">
            {computedPurchaseMode === 'mixed'
              ? 'Mixed self & gift order'
              : computedPurchaseMode === 'gift'
                ? 'Your gift order'
                : 'Your order'}
          </span>
          <Image
            src={event.image}
            alt={event.title}
            width={760}
            height={480}
            referrerPolicy="no-referrer"
          />
          <h2>{event.title}</h2>
          <p>{event.date}</p>
          <p>
            {event.location}, {event.city}
          </p>
          <hr />
          <div>
            <span>Order type</span>
            <b>
              {computedPurchaseMode === 'mixed'
                ? `${selfCount} for you · ${giftCount} ${giftCount === 1 ? 'gift' : 'gifts'}`
                : computedPurchaseMode === 'gift'
                  ? `Gift (${giftCount})`
                  : `For myself (${selfCount})`}
            </b>
          </div>
          {availableTypes
            .filter((t) => (quantities[t.id] || 0) > 0)
            .map((t) => {
              const count = quantities[t.id] || 0
              return (
                <div key={t.id}>
                  <span>
                    {t.name} × {count}
                  </span>
                  <b>{formatMoney(t.price * count)}</b>
                </div>
              )
            })}
          <div>
            <span>Service fee</span>
            <b>{formatMoney(fee)}</b>
          </div>
          {resolvedSlots.length > 0 && (
            <>
              <hr />
              <div className="block space-y-1 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-900 block">Ticket assignments</span>
                {resolvedSlots.map(({ slotKey, ticketName, assignment }, i) => (
                  <p key={slotKey} className="m-0">
                    #{i + 1} {ticketName}:{' '}
                    {assignment.assignmentType === 'gift'
                      ? `Gift → ${assignment.recipientName.trim() || 'Recipient name'}${
                          assignment.recipientEmail.trim()
                            ? ` (${assignment.recipientEmail.trim()})`
                            : ''
                        }`
                      : `For you (${buyerFullName || 'Buyer'})`}
                  </p>
                ))}
              </div>
            </>
          )}
          <hr />
          <div className="total">
            <span>Total (1 payment)</span>
            <b>{formatMoney(grandTotal)}</b>
          </div>
        </aside>
      </main>
    </>
  )
}

function OrganizersPage({ currentUser }: { currentUser?: PublicUserProfile }) {
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
      'From intimate dinners to arena shows—if people need a ticket, AZORTIX can help you welcome them.',
    ],
  ]
  return (
    <>
      <Header dark currentUser={currentUser} />
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
              AZORTIX gives us one less thing to worry about. Our pages look good, our guests move
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

function NotFound({ currentUser }: { currentUser?: PublicUserProfile }) {
  return (
    <>
      <Header currentUser={currentUser} />
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
  currentUser = null,
}: {
  events: EventItem[]
  initialPath: string
  currentUser?: PublicUserProfile
}) {
  const path = initialPath
  if (path === '/') return <HomePage events={events} currentUser={currentUser} />
  if (path === '/discover') return <DiscoverPage events={events} currentUser={currentUser} />
  if (path === '/organizers') return <OrganizersPage currentUser={currentUser} />
  if (path.startsWith('/events/')) {
    const event = events.find((e) => e.id === path.split('/')[2])
    return event ? (
      <EventPage event={event} events={events} currentUser={currentUser} />
    ) : (
      <NotFound currentUser={currentUser} />
    )
  }
  if (path.startsWith('/checkout/')) {
    const event = events.find((e) => e.id === path.split('/')[2])
    return event ? (
      <CheckoutPage event={event} currentUser={currentUser} />
    ) : (
      <NotFound currentUser={currentUser} />
    )
  }
  return <NotFound currentUser={currentUser} />
}
