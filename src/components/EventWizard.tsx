'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { BrandLogo } from './BrandLogo'

const steps = [
  'Basic info',
  'Date & location',
  'Design',
  'Tickets',
  'Attendee info',
  'Review & publish',
]
const categories = [
  'Music',
  'Festival',
  'Conference',
  'Lifestyle',
  'Community',
  'Food & Drink',
  'Arts & Culture',
  'Nightlife',
  'Business',
  'Wellness',
]

const emptyTicket = {
  name: 'General admission',
  description: '',
  price: 0,
  quantity: 100,
  minPerOrder: 1,
  maxPerOrder: 8,
  preset: 'general',
  salesOpenAt: '',
  salesCloseAt: '',
  perks: [],
  ticketMode: 'single',
  groupSize: 2,
  visibility: 'public',
  salesStatus: 'active',
}

export default function EventWizard({
  initialEvent,
  initialTickets = [],
}: {
  initialEvent?: any
  initialTickets?: any[]
}) {
  const [step, setStep] = useState(Math.max(1, Number(initialEvent?.wizardStep) || 1))
  const [eventId, setEventId] = useState(initialEvent?.id || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [gallery, setGallery] = useState<File[]>([])
  const [data, setData] = useState<any>({
    title: initialEvent?.title || '',
    category: initialEvent?.category || 'Music',
    shortDescription: initialEvent?.shortDescription || '',
    description: initialEvent?.description || '',
    eventFormat: initialEvent?.eventFormat || 'physical',
    visibility: initialEvent?.visibility || 'public',
    ageRestriction: initialEvent?.ageRestriction || 'all-ages',
    startsAt: initialEvent?.startsAt?.slice(0, 16) || '',
    endsAt: initialEvent?.endsAt?.slice(0, 16) || '',
    venue: initialEvent?.venue || '',
    address: initialEvent?.address || '',
    virtualLink: initialEvent?.virtualLink || '',
    scheduleType: initialEvent?.scheduleType || 'single',
    sessions: initialEvent?.sessions || [],
    videoURL: initialEvent?.videoURL || '',
    pageAppearance: initialEvent?.pageAppearance || 'light',
    contactName: initialEvent?.contactName || '',
    contactEmail: initialEvent?.contactEmail || '',
    contactPhone: initialEvent?.contactPhone || '',
    capacity: initialEvent?.capacity || 100,
    attendeeQuestions: initialEvent?.attendeeQuestions || [],
    terms: initialEvent?.terms || '',
    entryRequirements: initialEvent?.entryRequirements || '',
    refundPolicy: initialEvent?.refundPolicy || '',
    tickets: initialTickets.length
      ? initialTickets.map((ticket) => ({
          ...ticket,
          salesOpenAt: ticket.salesOpenAt?.slice(0, 16) || '',
          salesCloseAt: ticket.salesCloseAt?.slice(0, 16) || '',
          perks: (ticket.perks || []).map((item: any) => item.perk),
        }))
      : [{ ...emptyTicket }],
  })

  const update = (name: string, value: unknown) =>
    setData((current: any) => ({ ...current, [name]: value }))
  const ticketTotal = useMemo(
    () => data.tickets.reduce((sum: number, ticket: any) => sum + Number(ticket.quantity || 0), 0),
    [data.tickets],
  )

  async function save(submit = false) {
    setBusy(true)
    setError('')
    setNotice('')
    const form = new FormData()
    form.set('payload', JSON.stringify({ ...data, eventId, step, submit }))
    if (cover) form.set('cover', cover)
    gallery.forEach((file) => form.append('gallery', file))
    const response = await fetch('/api/dashboard/event-wizard', { method: 'POST', body: form })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) return setError(result.error || 'The draft could not be saved.')
    setEventId(result.eventId)
    setCover(null)
    setGallery([])
    setNotice(result.message)
    if (submit) window.location.assign('/dashboard/organizer#events')
  }

  async function continueStep(event: FormEvent) {
    event.preventDefault()
    await save(false)
    if (step < 6) setStep((current) => current + 1)
  }

  function updateTicket(index: number, field: string, value: unknown) {
    update(
      'tickets',
      data.tickets.map((ticket: any, ticketIndex: number) =>
        ticketIndex === index ? { ...ticket, [field]: value } : ticket,
      ),
    )
  }

  return (
    <div className="wizard-shell">
      <aside className="wizard-sidebar">
        <BrandLogo light />
        <div>
          <span className="eyebrow">Event studio</span>
          <h1>{eventId ? 'Edit event' : 'Create event'}</h1>
          <p>Drafts save to your organizer account and can be resumed at any time.</p>
        </div>
        <ol>
          {steps.map((label, index) => (
            <li
              className={step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''}
              key={label}
            >
              <button type="button" onClick={() => setStep(index + 1)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <Link href="/dashboard/organizer">Back to dashboard</Link>
      </aside>
      <main className="wizard-main">
        <header>
          <div>
            <span>Step {step} of 6</span>
            <h2>{steps[step - 1]}</h2>
          </div>
          <button
            type="button"
            className="button button-cream"
            disabled={busy}
            onClick={() => save(false)}
          >
            Save draft
          </button>
        </header>
        <div className="wizard-progress">
          <i style={{ width: `${(step / 6) * 100}%` }} />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="form-success">{notice}</p>}
        <form className="wizard-form" onSubmit={continueStep}>
          {step === 1 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>01</span>
                <div>
                  <h3>Tell people what’s happening</h3>
                  <p>Start with the essentials. You can refine this while the event is in draft.</p>
                </div>
              </div>
              <div className="wizard-grid">
                <label className="wide">
                  Event title
                  <input
                    required
                    minLength={3}
                    value={data.title}
                    onChange={(e) => update('title', e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={data.category}
                    onChange={(e) => update('category', e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Format
                  <select
                    value={data.eventFormat}
                    onChange={(e) => update('eventFormat', e.target.value)}
                  >
                    <option value="physical">Physical</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
                <label>
                  Visibility
                  <select
                    value={data.visibility}
                    onChange={(e) => update('visibility', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private / invite link</option>
                  </select>
                </label>
                <label>
                  Age restriction
                  <select
                    value={data.ageRestriction}
                    onChange={(e) => update('ageRestriction', e.target.value)}
                  >
                    {['all-ages', '13+', '16+', '18+', '21+'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Short description
                  <input
                    maxLength={180}
                    value={data.shortDescription}
                    onChange={(e) => update('shortDescription', e.target.value)}
                  />
                  <small>{data.shortDescription.length}/180</small>
                </label>
                <label className="wide">
                  Full description
                  <textarea
                    required
                    minLength={30}
                    value={data.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                </label>
              </div>
            </section>
          )}
          {step === 2 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>02</span>
                <div>
                  <h3>Set the place and time</h3>
                  <p>AZOR TIX events are currently available in Abuja only.</p>
                </div>
              </div>
              <div className="location-lock">
                <b>Nigeria</b>
                <span>FCT</span>
                <strong>Abuja</strong>
              </div>
              <div className="wizard-grid">
                <label>
                  Starts
                  <input
                    type="datetime-local"
                    required
                    value={data.startsAt}
                    onChange={(e) => update('startsAt', e.target.value)}
                  />
                </label>
                <label>
                  Ends
                  <input
                    type="datetime-local"
                    required
                    value={data.endsAt}
                    onChange={(e) => update('endsAt', e.target.value)}
                  />
                </label>
                <label>
                  Venue
                  <input
                    required
                    value={data.venue}
                    onChange={(e) => update('venue', e.target.value)}
                  />
                </label>
                <label>
                  Capacity
                  <input
                    type="number"
                    min="1"
                    required
                    value={data.capacity}
                    onChange={(e) => update('capacity', Number(e.target.value))}
                  />
                </label>
                <label className="wide">
                  Full address
                  <input
                    required
                    value={data.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                </label>
                {data.eventFormat !== 'physical' && (
                  <label className="wide">
                    Virtual event link
                    <input
                      type="url"
                      value={data.virtualLink}
                      onChange={(e) => update('virtualLink', e.target.value)}
                    />
                  </label>
                )}
                <label>
                  Schedule
                  <select
                    value={data.scheduleType}
                    onChange={(e) => update('scheduleType', e.target.value)}
                  >
                    <option value="single">Single event</option>
                    <option value="recurring">Recurring</option>
                    <option value="multiple">Multiple sessions</option>
                  </select>
                </label>
              </div>
              {data.scheduleType !== 'single' && (
                <div className="repeater">
                  {(data.sessions || []).map((session: any, index: number) => (
                    <div className="repeater-row" key={index}>
                      <input
                        placeholder="Session name"
                        value={session.name || ''}
                        onChange={(e) =>
                          update(
                            'sessions',
                            data.sessions.map((item: any, i: number) =>
                              i === index ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <input
                        type="datetime-local"
                        value={session.startsAt?.slice(0, 16) || ''}
                        onChange={(e) =>
                          update(
                            'sessions',
                            data.sessions.map((item: any, i: number) =>
                              i === index ? { ...item, startsAt: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <input
                        type="datetime-local"
                        value={session.endsAt?.slice(0, 16) || ''}
                        onChange={(e) =>
                          update(
                            'sessions',
                            data.sessions.map((item: any, i: number) =>
                              i === index ? { ...item, endsAt: e.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="table-action"
                    onClick={() =>
                      update('sessions', [...data.sessions, { name: '', startsAt: '', endsAt: '' }])
                    }
                  >
                    + Add session
                  </button>
                </div>
              )}
            </section>
          )}
          {step === 3 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>03</span>
                <div>
                  <h3>Make the page yours</h3>
                  <p>Upload a strong cover and choose the public page’s mood.</p>
                </div>
              </div>
              <div className="wizard-grid">
                <label className="wide upload-zone">
                  Cover image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required={!initialEvent?.heroImage && !cover}
                    onChange={(e) => setCover(e.target.files?.[0] || null)}
                  />
                  <span>
                    {cover?.name ||
                      (initialEvent?.heroImage
                        ? 'Existing cover retained'
                        : 'JPG, PNG, or WebP · max 8 MB')}
                  </span>
                </label>
                <label className="wide upload-zone">
                  Gallery images
                  <input
                    multiple
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setGallery(Array.from(e.target.files || []))}
                  />
                  <span>{gallery.length ? `${gallery.length} selected` : 'Optional'}</span>
                </label>
                <label>
                  Page appearance
                  <select
                    value={data.pageAppearance}
                    onChange={(e) => update('pageAppearance', e.target.value)}
                  >
                    <option value="light">Editorial light</option>
                    <option value="dark">After-dark</option>
                    <option value="turquoise">AZOR turquoise</option>
                  </select>
                </label>
                <label>
                  Optional video URL
                  <input
                    type="url"
                    value={data.videoURL}
                    onChange={(e) => update('videoURL', e.target.value)}
                  />
                </label>
                <label>
                  Organizer / contact name
                  <input
                    value={data.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                  />
                </label>
                <label>
                  Contact email
                  <input
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) => update('contactEmail', e.target.value)}
                  />
                </label>
                <label>
                  Contact phone
                  <input
                    type="tel"
                    value={data.contactPhone}
                    onChange={(e) => update('contactPhone', e.target.value)}
                  />
                </label>
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>04</span>
                <div>
                  <h3>Build your ticket inventory</h3>
                  <p>
                    Add unlimited categories with separate prices, limits, windows, and visibility.
                  </p>
                </div>
              </div>
              <div className="ticket-editor-list">
                {data.tickets.map((ticket: any, index: number) => (
                  <article className="ticket-editor" key={ticket.id || index}>
                    <header>
                      <b>Ticket {index + 1}</b>
                      {data.tickets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              'tickets',
                              data.tickets.filter((_: any, i: number) => i !== index),
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </header>
                    <div className="wizard-grid">
                      <label>
                        Name
                        <input
                          required
                          value={ticket.name}
                          onChange={(e) => updateTicket(index, 'name', e.target.value)}
                        />
                      </label>
                      <label>
                        Preset
                        <select
                          value={ticket.preset}
                          onChange={(e) => updateTicket(index, 'preset', e.target.value)}
                        >
                          {['early-bird', 'general', 'vip', 'table', 'custom'].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Price (NGN)
                        <input
                          type="number"
                          min="0"
                          required
                          value={ticket.price}
                          onChange={(e) => updateTicket(index, 'price', Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Quantity
                        <input
                          type="number"
                          min="1"
                          required
                          value={ticket.quantity}
                          onChange={(e) => updateTicket(index, 'quantity', Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Minimum per order
                        <input
                          type="number"
                          min="1"
                          value={ticket.minPerOrder}
                          onChange={(e) =>
                            updateTicket(index, 'minPerOrder', Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Maximum per order
                        <input
                          type="number"
                          min="1"
                          value={ticket.maxPerOrder}
                          onChange={(e) =>
                            updateTicket(index, 'maxPerOrder', Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        Sales open
                        <input
                          type="datetime-local"
                          value={ticket.salesOpenAt}
                          onChange={(e) => updateTicket(index, 'salesOpenAt', e.target.value)}
                        />
                      </label>
                      <label>
                        Sales close
                        <input
                          type="datetime-local"
                          value={ticket.salesCloseAt}
                          onChange={(e) => updateTicket(index, 'salesCloseAt', e.target.value)}
                        />
                      </label>
                      <label>
                        Type
                        <select
                          value={ticket.ticketMode}
                          onChange={(e) => updateTicket(index, 'ticketMode', e.target.value)}
                        >
                          <option value="single">Single</option>
                          <option value="group">Group</option>
                        </select>
                      </label>
                      <label>
                        Visibility
                        <select
                          value={ticket.visibility}
                          onChange={(e) => updateTicket(index, 'visibility', e.target.value)}
                        >
                          <option value="public">Public</option>
                          <option value="invite-only">Invite only</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={ticket.salesStatus}
                          onChange={(e) => updateTicket(index, 'salesStatus', e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="sold-out">Sold out</option>
                        </select>
                      </label>
                      <label className="wide">
                        Description
                        <textarea
                          value={ticket.description}
                          onChange={(e) => updateTicket(index, 'description', e.target.value)}
                        />
                      </label>
                      <label className="wide">
                        Perks (one per line)
                        <textarea
                          value={(ticket.perks || []).join('\n')}
                          onChange={(e) => updateTicket(index, 'perks', e.target.value.split('\n'))}
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
              <button
                type="button"
                className="button button-cream"
                onClick={() => update('tickets', [...data.tickets, { ...emptyTicket, name: '' }])}
              >
                + Add ticket category
              </button>
            </section>
          )}
          {step === 5 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>05</span>
                <div>
                  <h3>Collect the right attendee details</h3>
                  <p>Name, email, and phone are always collected securely at checkout.</p>
                </div>
              </div>
              <div className="required-fields">
                <span>Full name</span>
                <span>Email</span>
                <span>Phone</span>
              </div>
              <div className="repeater">
                {data.attendeeQuestions.map((question: any, index: number) => (
                  <div className="question-row" key={index}>
                    <input
                      placeholder="Question"
                      value={question.label}
                      onChange={(e) =>
                        update(
                          'attendeeQuestions',
                          data.attendeeQuestions.map((item: any, i: number) =>
                            i === index ? { ...item, label: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    <select
                      value={question.type}
                      onChange={(e) =>
                        update(
                          'attendeeQuestions',
                          data.attendeeQuestions.map((item: any, i: number) =>
                            i === index ? { ...item, type: e.target.value } : item,
                          ),
                        )
                      }
                    >
                      <option value="text">Text</option>
                      <option value="multiple-choice">Multiple choice</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="date">Date</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(question.required)}
                        onChange={(e) =>
                          update(
                            'attendeeQuestions',
                            data.attendeeQuestions.map((item: any, i: number) =>
                              i === index ? { ...item, required: e.target.checked } : item,
                            ),
                          )
                        }
                      />{' '}
                      Required
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          'attendeeQuestions',
                          data.attendeeQuestions.filter((_: any, i: number) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="table-action"
                  onClick={() =>
                    update('attendeeQuestions', [
                      ...data.attendeeQuestions,
                      { label: '', type: 'text', required: false, options: [] },
                    ])
                  }
                >
                  + Add custom question
                </button>
              </div>
              <div className="wizard-grid">
                <label className="wide">
                  Terms and conditions
                  <textarea value={data.terms} onChange={(e) => update('terms', e.target.value)} />
                </label>
                <label className="wide">
                  Entry requirements
                  <textarea
                    value={data.entryRequirements}
                    onChange={(e) => update('entryRequirements', e.target.value)}
                  />
                </label>
              </div>
            </section>
          )}
          {step === 6 && (
            <section className="wizard-card review-card">
              <div className="wizard-card-head">
                <span>06</span>
                <div>
                  <h3>Ready for review?</h3>
                  <p>
                    AZOR TIX staff will check your page before it goes live. You can continue
                    editing drafts until submission.
                  </p>
                </div>
              </div>
              <div className="review-summary">
                <div>
                  <span>Event</span>
                  <b>{data.title || 'Untitled event'}</b>
                  <p>
                    {data.category} · {data.eventFormat} · {data.visibility}
                  </p>
                </div>
                <div>
                  <span>Schedule</span>
                  <b>
                    {data.startsAt ? new Date(data.startsAt).toLocaleString('en-NG') : 'Not set'}
                  </b>
                  <p>{data.venue || 'Venue not set'}, Abuja</p>
                </div>
                <div>
                  <span>Inventory</span>
                  <b>
                    {data.tickets.length} categories · {ticketTotal} tickets
                  </b>
                  <p>5% organizer commission · 2% customer service fee</p>
                </div>
              </div>
              <label className="wide">
                Refund policy
                <textarea
                  required
                  minLength={10}
                  value={data.refundPolicy}
                  onChange={(e) => update('refundPolicy', e.target.value)}
                  placeholder="Explain whether tickets are refundable and any deadlines."
                />
              </label>
              <div className="approval-note">
                <b>Approval workflow</b>
                <p>
                  Submitting does not publish the event. AZOR TIX Admin or Super Admin must approve
                  it first.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                className="button button-coral full"
                onClick={() => save(true)}
              >
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
            </section>
          )}
          <footer className="wizard-actions">
            <button
              type="button"
              disabled={step === 1 || busy}
              onClick={() => setStep((current) => current - 1)}
            >
              Back
            </button>
            {step < 6 && (
              <button className="button button-dark" disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Save & continue'}
              </button>
            )}
          </footer>
        </form>
      </main>
    </div>
  )
}
