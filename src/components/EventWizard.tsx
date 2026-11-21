'use client'

import Link from 'next/link'
import { Check, Copy, ExternalLink, ImageIcon, Loader2, Lock, Share2, Sparkles, Trash2, Upload } from 'lucide-react'
import { FormEvent, useMemo, useRef, useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { BrandLogo } from './BrandLogo'

interface UploadedMediaRef {
  id: string
  url: string
  filename?: string
}

function normalizeInitialMedia(value: any): UploadedMediaRef | null {
  if (!value || typeof value !== 'object') return null
  if (!value.id || !value.url) return null
  return {
    id: String(value.id),
    url: String(value.url),
    filename: typeof value.filename === 'string' ? value.filename : undefined,
  }
}

function normalizeInitialGallery(value: any): UploadedMediaRef[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizeInitialMedia).filter((item): item is UploadedMediaRef => Boolean(item))
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png|webp)$/i
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

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

function toSlugPreview(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const emptyTicket = {
  name: '',
  ticketKind: 'paid',
  description: '',
  price: 0,
  quantity: 50,
  minPerOrder: 1,
  maxPerOrder: 8,
  preset: 'custom',
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
  dashboardUrl = '/dashboard',
}: {
  initialEvent?: any
  initialTickets?: any[]
  dashboardUrl?: string
}) {
  const [step, setStep] = useState(Math.max(1, Number(initialEvent?.wizardStep) || 1))
  const [eventId, setEventId] = useState(initialEvent?.id || '')
  const [eventSlug, setEventSlug] = useState<string>(initialEvent?.slug || '')
  const [eventStatus, setEventStatus] = useState<string>(initialEvent?._status || 'draft')
  const [reviewStatus, setReviewStatus] = useState<string>(initialEvent?.reviewStatus || 'draft')
  const reviewNote = typeof initialEvent?.reviewNote === 'string' ? initialEvent.reviewNote : ''
  const [slugTouched, setSlugTouched] = useState(Boolean(initialEvent?.slug))
  const [copied, setCopied] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [heroImage, setHeroImage] = useState<UploadedMediaRef | null>(() =>
    normalizeInitialMedia(initialEvent?.heroImage),
  )
  const [coverTempPreview, setCoverTempPreview] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [galleryItems, setGalleryItems] = useState<UploadedMediaRef[]>(() =>
    normalizeInitialGallery(initialEvent?.gallery),
  )
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const [aiTone, setAiTone] = useState<
    'professional' | 'exciting' | 'luxury' | 'casual' | 'nightlife' | 'corporate'
  >('professional')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiShortSuggestion, setAiShortSuggestion] = useState('')

  const inFlightRef = useRef(false)
  const clientRequestIdRef = useRef(
    initialEvent?.clientRequestId ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `wiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
  )

  const [data, setData] = useState<any>({
    title: initialEvent?.title || '',
    slug: initialEvent?.slug || '',
    category: initialEvent?.category || 'Music',
    shortDescription: initialEvent?.shortDescription || '',
    description: initialEvent?.description || '',
    eventFormat: initialEvent?.eventFormat || 'physical',
    visibility: initialEvent?.visibility || 'public',
    ageRestriction: initialEvent?.ageRestriction || 'all-ages',
    startsAt: initialEvent?.startsAt?.slice(0, 16) || '',
    endsAt: initialEvent?.endsAt?.slice(0, 16) || '',
    timezone: initialEvent?.timezone || 'Africa/Lagos',
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
          ticketKind:
            ticket.ticketKind || (Number(ticket.price) === 0 ? 'free' : 'paid'),
          salesOpenAt: ticket.salesOpenAt?.slice(0, 16) || '',
          salesCloseAt: ticket.salesCloseAt?.slice(0, 16) || '',
          perks: (ticket.perks || []).map((item: any) => item.perk),
        }))
      : [],
  })

  const update = (name: string, value: unknown) =>
    setData((current: any) => ({ ...current, [name]: value }))

  const ticketTotal = useMemo(
    () => data.tickets.reduce((sum: number, ticket: any) => sum + Number(ticket.quantity || 0), 0),
    [data.tickets],
  )

  const freeTicketTotal = useMemo(
    () =>
      data.tickets
        .filter((t: any) => t.ticketKind === 'free' || Number(t.price) === 0)
        .reduce((sum: number, t: any) => sum + Math.max(0, Number(t.quantity || 0)), 0),
    [data.tickets],
  )

  const activeSlug = eventSlug || data.slug || ''
  const fullEventUrl =
    activeSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/events/${activeSlug}`
      : activeSlug
        ? `https://azortix.com/events/${activeSlug}`
        : ''

  async function copyEventLink() {
    if (!activeSlug) return
    const target = `${window.location.origin}/events/${activeSlug}`
    await navigator.clipboard?.writeText(target).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareEventLink() {
    if (!activeSlug) return
    const target = `${window.location.origin}/events/${activeSlug}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: data.title || 'AZORTIX Event',
          text: data.shortDescription || `Get tickets for ${data.title || 'this event'} on AZORTIX`,
          url: target,
        })
        return
      } catch {
        // User cancelled or share unsupported — fall back to clipboard copy
      }
    }
    await navigator.clipboard?.writeText(target).catch(() => {})
    setShareNote('Event link copied to clipboard for sharing.')
    setTimeout(() => setShareNote(''), 2500)
  }

  async function runAiDescription(action: 'improve' | 'regenerate' | 'shorten' | 'expand') {
    if (aiBusy) return
    setAiBusy(true)
    setAiError('')
    try {
      const response = await fetch('/api/dashboard/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          category: data.category,
          eventFormat: data.eventFormat,
          venue: data.venue,
          startsAt: data.startsAt,
          shortDescription: data.shortDescription,
          currentDescription: aiSuggestion && action !== 'improve' ? aiSuggestion : data.description,
          tone: aiTone,
          action,
        }),
      })
      const result = await response.json().catch(() => ({ error: 'Unexpected AI response.' }))
      if (!response.ok) {
        if (result?.requirePasswordChange) {
          window.location.assign('/change-password')
          return
        }
        setAiError(result.error || 'Could not generate AI description.')
        return
      }
      setAiSuggestion(result.improvedDescription || '')
      setAiShortSuggestion(result.suggestedShortDescription || '')
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Network error while generating AI event description.',
      )
    } finally {
      setAiBusy(false)
    }
  }

  function validateImageFile(file: File): string | null {
    if (!file.size) return 'Selected image file is empty.'
    if (file.size > MAX_UPLOAD_BYTES) {
      return `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Images must be under 10 MB.`
    }
    const mimeOk = file.type ? ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase()) : false
    const extOk = ALLOWED_IMAGE_EXT.test(file.name || '')
    if (!mimeOk && !extOk) {
      return `"${file.name}" is not a supported image format. Use JPG, PNG, or WebP.`
    }
    return null
  }

  async function handleCoverFileChange(file: File | null) {
    if (!file) return
    setCoverError('')
    setError('')
    const validationErr = validateImageFile(file)
    if (validationErr) {
      setCoverError(validationErr)
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setCoverTempPreview(previewUrl)
    setCoverUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('kind', 'cover')
      form.set('alt', `${data.title || 'AZORTIX event'} cover artwork`)
      if (eventId) form.set('eventId', String(eventId))

      const response = await fetch('/api/dashboard/media', {
        method: 'POST',
        body: form,
      })
      const result = await response.json().catch(() => ({ error: 'Unexpected upload response.' }))
      if (!response.ok) {
        if (result?.requirePasswordChange) {
          window.location.assign('/change-password')
          return
        }
        setCoverError(result.error || 'Cover image upload failed. Please try again.')
        return
      }
      if (result.media?.id && result.media?.url) {
        setHeroImage({
          id: String(result.media.id),
          url: String(result.media.url),
          filename: String(result.media.filename || file.name),
        })
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.cover
          return next
        })
        setNotice(
          result.linkedToEvent
            ? 'Cover photo uploaded and saved to your event.'
            : 'Cover photo uploaded! Save or continue to keep it on your event.',
        )
      } else {
        setCoverError('Upload succeeded but no image URL was returned. Please try again.')
      }
    } catch (err) {
      setCoverError(
        err instanceof Error ? err.message : 'Network error while uploading cover photo.',
      )
    } finally {
      setCoverUploading(false)
      setCoverTempPreview(null)
      URL.revokeObjectURL(previewUrl)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  async function handleGalleryFilesChange(files: File[]) {
    if (!files.length) return
    setGalleryError('')
    setGalleryUploading(true)
    const errors: string[] = []
    const added: UploadedMediaRef[] = []

    try {
      for (const file of files.slice(0, 10)) {
        const validationErr = validateImageFile(file)
        if (validationErr) {
          errors.push(validationErr)
          continue
        }
        const form = new FormData()
        form.set('file', file)
        form.set('kind', 'gallery')
        form.set('alt', `${data.title || 'AZORTIX event'} gallery photo`)
        if (eventId) form.set('eventId', String(eventId))

        const response = await fetch('/api/dashboard/media', {
          method: 'POST',
          body: form,
        })
        const result = await response.json().catch(() => ({ error: 'Unexpected upload response.' }))
        if (!response.ok || !result.media?.id || !result.media?.url) {
          errors.push(result.error || `Failed to upload "${file.name}".`)
          continue
        }
        added.push({
          id: String(result.media.id),
          url: String(result.media.url),
          filename: String(result.media.filename || file.name),
        })
      }

      if (added.length > 0) {
        setGalleryItems((prev) => {
          const seen = new Set(prev.map((item) => item.id))
          return [...prev, ...added.filter((item) => !seen.has(item.id))]
        })
        setNotice(
          `${added.length} gallery ${added.length === 1 ? 'photo' : 'photos'} uploaded and saved.`,
        )
      }
      if (errors.length > 0) {
        setGalleryError(errors.join(' '))
      }
    } catch (err) {
      setGalleryError(
        err instanceof Error ? err.message : 'Network error while uploading gallery photos.',
      )
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  async function save(options: { submit?: boolean; publish?: boolean } = {}) {
    if (inFlightRef.current) return false
    if (coverUploading || galleryUploading) {
      setError('Please wait for your image upload to finish before saving.')
      return false
    }
    const { submit = false, publish = false } = options

    if (freeTicketTotal > 10) {
      setError(
        `Free ticket allocation cannot exceed 10 tickets per event (currently ${freeTicketTotal}/10 across free ticket categories).`,
      )
      setFieldErrors({ tickets: 'Reduce total free ticket quantity to 10 or fewer.' })
      setStep(4)
      return false
    }

    inFlightRef.current = true
    setBusy(true)
    setError('')
    setNotice('')
    setFieldErrors({})

    try {
      const form = new FormData()
      form.set(
        'payload',
        JSON.stringify({
          ...data,
          eventId,
          heroImageId: heroImage?.id ?? null,
          galleryIds: galleryItems.map((item) => item.id),
          clientRequestId: clientRequestIdRef.current,
          step,
          submit,
          publish,
        }),
      )

      const response = await fetch('/api/dashboard/event-wizard', { method: 'POST', body: form })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))

      if (!response.ok) {
        if (result?.requirePasswordChange) {
          window.location.assign('/change-password')
          return false
        }
        setError(result.error || 'The draft could not be saved.')
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          setFieldErrors(result.fieldErrors)
        }
        if (typeof result.missingStep === 'number' && result.missingStep >= 1 && result.missingStep <= 6) {
          setStep(result.missingStep)
        }
        return false
      }

      setEventId(result.eventId)
      if (result.slug) {
        setEventSlug(result.slug)
        update('slug', result.slug)
        setSlugTouched(true)
      }
      if (result.status) setEventStatus(result.status)
      if (result.reviewStatus) setReviewStatus(result.reviewStatus)
      if (result.heroImage !== undefined) {
        setHeroImage(result.heroImage)
      }
      if (Array.isArray(result.gallery)) {
        setGalleryItems(result.gallery)
      }
      if (Array.isArray(result.tickets) && result.tickets.length > 0) {
        setData((current: any) => ({ ...current, tickets: result.tickets }))
      }
      setNotice(result.message || 'Saved.')
      if ((publish || submit) && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return true
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Network error while saving your event. Please try again.',
      )
      return false
    } finally {
      inFlightRef.current = false
      setBusy(false)
    }
  }

  async function continueStep(event: FormEvent) {
    event.preventDefault()
    const ok = await save({ publish: false, submit: false })
    if (ok && step < 6) setStep((current) => current + 1)
  }

  function updateTicket(index: number, field: string, value: unknown) {
    update(
      'tickets',
      data.tickets.map((ticket: any, ticketIndex: number) => {
        if (ticketIndex !== index) return ticket
        if (field === 'ticketKind') {
          const nextKind = value === 'free' ? 'free' : 'paid'
          return {
            ...ticket,
            ticketKind: nextKind,
            price: nextKind === 'free' ? 0 : Math.max(500, Number(ticket.price) || 5000),
            maxPerOrder:
              nextKind === 'free' ? Math.min(4, Number(ticket.quantity) || 4) : ticket.maxPerOrder || 8,
          }
        }
        return { ...ticket, [field]: value }
      }),
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
        <a href={dashboardUrl} className="wizard-back-link">
          ← Back to dashboard
        </a>
      </aside>
      <main className="wizard-main">
        <header>
          <div>
            <span>Step {step} of 6</span>
            <h2>{steps[step - 1]}</h2>
          </div>
          <div className="wizard-header-actions">
            <a href={dashboardUrl} className="button button-cream">
              Back to dashboard
            </a>
            <button
              type="button"
              className="button button-dark"
              disabled={busy}
              onClick={() => save({ publish: false, submit: false })}
            >
              {busy ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </header>
        <div className="wizard-progress">
          <i style={{ width: `${(step / 6) * 100}%` }} />
        </div>
        {reviewStatus === 'rejected' && (
          <div className="form-error" role="alert" style={{ marginBottom: 14 }}>
            <strong>This event was rejected by AZORTIX administration and remains unpublished.</strong>
            {reviewNote ? ` Reason: ${reviewNote}` : ''} Update the required details and submit
            again for approval on Step 6.
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="form-success">{notice}</p>}
        {shareNote && <p className="form-success">{shareNote}</p>}
        {activeSlug && (
          <div className="event-link-banner" data-testid="wizard-event-link-banner">
            <div>
              <span className="eyebrow">
                {eventStatus === 'published' && reviewStatus === 'approved'
                  ? 'Published · Live Event URL'
                  : reviewStatus === 'pending'
                    ? 'Pending Admin Approval · Reserved Event URL'
                    : reviewStatus === 'rejected'
                      ? 'Changes Requested · Reserved Event URL'
                      : 'Draft · Reserved Event URL'}
              </span>
              <strong>{data.title || 'Untitled event'}</strong>
              <code className="event-url-code">{fullEventUrl}</code>
            </div>
            <div className="event-link-actions">
              <button type="button" className="button button-cream" onClick={copyEventLink}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Link copied!' : 'Copy Event Link'}</span>
              </button>
              <button type="button" className="button button-cream" onClick={shareEventLink}>
                <Share2 size={14} />
                <span>Share Event</span>
              </button>
              {eventStatus === 'published' && reviewStatus === 'approved' ? (
                <a
                  className="button button-coral"
                  href={`/events/${activeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} />
                  <span>View Event</span>
                </a>
              ) : (
                <span className="draft-url-note">
                  {reviewStatus === 'pending'
                    ? 'Awaiting Admin Approval before going live'
                    : 'Submit for Admin Approval to go live'}
                </span>
              )}
              {eventId && (
                <Link className="button button-dark" href={`/dashboard/organizer/events/${eventId}/edit`}>
                  Edit Event
                </Link>
              )}
            </div>
          </div>
        )}
        <form className="wizard-form" autoComplete="off" onSubmit={continueStep}>
          {step === 1 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>01</span>
                <div>
                  <h3>Tell people what’s happening</h3>
                  <p>Start with the essentials and customize your unique AZORTIX event URL.</p>
                </div>
              </div>
              <div className="wizard-grid">
                <label className="wide">
                  Event title
                  <input
                    required
                    minLength={3}
                    value={data.title}
                    onChange={(e) => {
                      const nextTitle = e.target.value
                      setData((current: any) => ({
                        ...current,
                        title: nextTitle,
                        ...(!slugTouched ? { slug: toSlugPreview(nextTitle) } : {}),
                      }))
                    }}
                  />
                  {fieldErrors.title && <small className="field-error-text">{fieldErrors.title}</small>}
                </label>
                <label className="wide">
                  Custom Event URL Slug
                  <div className="slug-input-group">
                    <span className="slug-prefix">https://azortix.com/events/</span>
                    <input
                      name="slug"
                      value={data.slug}
                      placeholder="abuja-groove-party"
                      onChange={(e) => {
                        setSlugTouched(true)
                        update('slug', toSlugPreview(e.target.value))
                      }}
                    />
                  </div>
                  <small>
                    Unique URL path. Changing a published URL automatically redirects old links to the
                    new address.
                  </small>
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
                  {fieldErrors.description && (
                    <small className="field-error-text">{fieldErrors.description}</small>
                  )}
                </label>
                <div className="wide ai-description-box">
                  <div className="ai-assist-bar">
                    <div className="ai-assist-meta">
                      <strong>AI writing assistant</strong>
                      <span>
                        Polish your description in seconds using your event facts. Your original
                        text stays safe until you choose to apply.
                      </span>
                    </div>
                    <div className="ai-assist-controls">
                      <select
                        aria-label="AI writing tone"
                        value={aiTone}
                        disabled={aiBusy}
                        onChange={(e) => setAiTone(e.target.value as any)}
                      >
                        <option value="professional">Professional</option>
                        <option value="exciting">Exciting &amp; promotional</option>
                        <option value="luxury">Luxury &amp; exclusive</option>
                        <option value="casual">Casual &amp; friendly</option>
                        <option value="nightlife">Nightlife &amp; entertainment</option>
                        <option value="corporate">Corporate &amp; formal</option>
                      </select>
                      <button
                        type="button"
                        className="button button-cream"
                        disabled={aiBusy}
                        onClick={() => runAiDescription('improve')}
                      >
                        <Sparkles size={14} />
                        <span>{aiBusy ? 'Writing…' : 'Improve with AI'}</span>
                      </button>
                    </div>
                  </div>
                  {aiError && (
                    <p className="form-error" role="alert" style={{ marginTop: 12 }}>
                      {aiError}
                    </p>
                  )}
                  {aiSuggestion && (
                    <div className="ai-preview-card">
                      <div className="ai-preview-head">
                        <span className="eyebrow">AI Suggestion Preview · Editable</span>
                        <div className="ai-preview-refine">
                          <button
                            type="button"
                            className="table-action"
                            disabled={aiBusy}
                            onClick={() => runAiDescription('regenerate')}
                          >
                            Regenerate
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            disabled={aiBusy}
                            onClick={() => runAiDescription('shorten')}
                          >
                            Shorten
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            disabled={aiBusy}
                            onClick={() => runAiDescription('expand')}
                          >
                            Expand
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={5}
                        value={aiSuggestion}
                        onChange={(e) => setAiSuggestion(e.target.value)}
                      />
                      {aiShortSuggestion && (
                        <p className="ai-short-preview">
                          Suggested short summary: <em>{aiShortSuggestion}</em>
                        </p>
                      )}
                      <div className="ai-preview-actions">
                        <button
                          type="button"
                          className="button button-coral"
                          onClick={() => {
                            update('description', aiSuggestion)
                            if (aiShortSuggestion && !data.shortDescription) {
                              update('shortDescription', aiShortSuggestion)
                            }
                            setAiSuggestion('')
                            setAiShortSuggestion('')
                            setNotice('AI description applied to your draft.')
                          }}
                        >
                          Use this description
                        </button>
                        {aiShortSuggestion && (
                          <button
                            type="button"
                            className="button button-cream"
                            onClick={() => {
                              update('description', aiSuggestion)
                              update('shortDescription', aiShortSuggestion)
                              setAiSuggestion('')
                              setAiShortSuggestion('')
                              setNotice('AI full & short descriptions applied.')
                            }}
                          >
                            Use both full &amp; summary
                          </button>
                        )}
                        <button
                          type="button"
                          className="button button-cream"
                          onClick={() => {
                            setAiSuggestion('')
                            setAiShortSuggestion('')
                          }}
                        >
                          Keep my original
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {step === 2 && (
            <section className="wizard-card">
              <div className="wizard-card-head">
                <span>02</span>
                <div>
                  <h3>Set the place and time</h3>
                  <p>AZORTIX events are currently available in Abuja only.</p>
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
                  {fieldErrors.startsAt && <small className="field-error-text">{fieldErrors.startsAt}</small>}
                </label>
                <label>
                  Ends
                  <input
                    type="datetime-local"
                    required
                    value={data.endsAt}
                    onChange={(e) => update('endsAt', e.target.value)}
                  />
                  {fieldErrors.endsAt && <small className="field-error-text">{fieldErrors.endsAt}</small>}
                </label>
                <label>
                  Venue
                  <input
                    required
                    value={data.venue}
                    onChange={(e) => update('venue', e.target.value)}
                  />
                  {fieldErrors.venue && <small className="field-error-text">{fieldErrors.venue}</small>}
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
                  {fieldErrors.capacity && <small className="field-error-text">{fieldErrors.capacity}</small>}
                </label>
                <label className="wide">
                  Full address
                  <input
                    required
                    value={data.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                  {fieldErrors.address && <small className="field-error-text">{fieldErrors.address}</small>}
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
                <div className="wide">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-700 mb-2">
                    Cover image (required for publishing)
                  </span>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
                    {(coverTempPreview || heroImage?.url) ? (
                      <div className="space-y-3">
                        <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900 aspect-[16/9] max-h-[320px] w-full">
                          <img
                            src={coverTempPreview || heroImage?.url}
                            alt={`${data.title || 'Event'} cover preview`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          {coverUploading && (
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-white text-sm font-medium">
                              <Loader2 size={18} className="animate-spin" />
                              <span>Uploading cover photo…</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
                          <span className="flex items-center gap-1.5 font-medium text-neutral-800 truncate">
                            <ImageIcon size={14} />
                            {coverUploading
                              ? 'Saving to AZORTIX storage…'
                              : heroImage?.filename || 'Saved cover image'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={coverUploading}
                              className="button button-cream"
                              onClick={() => coverInputRef.current?.click()}
                            >
                              <Upload size={14} />
                              <span>Replace photo</span>
                            </button>
                            <button
                              type="button"
                              disabled={coverUploading}
                              className="button button-cream"
                              onClick={() => {
                                setHeroImage(null)
                                setCoverError('')
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white px-6 py-8 text-center">
                        <Upload size={22} className="text-neutral-500" />
                        <p className="m-0 text-sm font-semibold text-neutral-900">
                          Upload your event cover photo
                        </p>
                        <p className="m-0 text-xs text-neutral-500">
                          JPG, PNG, or WebP · up to 10 MB · Recommended 1600×900
                        </p>
                        <button
                          type="button"
                          disabled={coverUploading}
                          className="button button-dark mt-2"
                          onClick={() => coverInputRef.current?.click()}
                        >
                          {coverUploading ? 'Uploading…' : 'Choose cover image'}
                        </button>
                      </div>
                    )}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(e) => handleCoverFileChange(e.target.files?.[0] || null)}
                    />
                    {(coverError || fieldErrors.cover) && (
                      <p className="form-error mt-3 mb-0" role="alert">
                        {coverError || fieldErrors.cover}
                      </p>
                    )}
                  </div>
                </div>

                <div className="wide">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-700 mb-2">
                    Gallery images (optional)
                  </span>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
                    {galleryItems.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {galleryItems.map((item) => (
                          <div
                            key={item.id}
                            className="relative group overflow-hidden rounded-lg border border-neutral-200 bg-white aspect-[4/3]"
                          >
                            <img
                              src={item.url}
                              alt={item.filename || 'Event gallery photo'}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              aria-label="Remove gallery photo"
                              onClick={() =>
                                setGalleryItems((prev) => prev.filter((g) => g.id !== item.id))
                              }
                              className="absolute top-1.5 right-1.5 rounded-md bg-black/75 p-1.5 text-white hover:bg-red-600 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500">
                        {galleryItems.length
                          ? `${galleryItems.length} gallery ${galleryItems.length === 1 ? 'photo' : 'photos'} saved`
                          : 'Add extra event photos to showcase the vibe (JPG, PNG, or WebP · max 10 MB each).'}
                      </span>
                      <button
                        type="button"
                        disabled={galleryUploading}
                        className="button button-cream"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        {galleryUploading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Uploading…</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Add gallery photos</span>
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      ref={galleryInputRef}
                      multiple
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(e) => handleGalleryFilesChange(Array.from(e.target.files || []))}
                    />
                    {galleryError && (
                      <p className="form-error mt-2 mb-0" role="alert">
                        {galleryError}
                      </p>
                    )}
                  </div>
                </div>

                <label>
                  Page appearance
                  <select
                    value={data.pageAppearance}
                    onChange={(e) => update('pageAppearance', e.target.value)}
                  >
                    <option value="light">Editorial light</option>
                    <option value="dark">After-dark</option>
                    <option value="turquoise">AZORTIX turquoise</option>
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
                  <h3>Build your public ticket categories</h3>
                  <p>
                    Only ticket categories you explicitly add here will appear on your public event
                    page. Need private complimentary passes? Issue them separately under{' '}
                    <strong>Free Ticket Invitations</strong> in your dashboard without creating a
                    public free category.
                  </p>
                </div>
              </div>
              <div className={`free-quota-bar ${freeTicketTotal > 10 ? 'over' : ''}`}>
                <span>
                  Public free tickets allocated across this event: <strong>{freeTicketTotal} / 10</strong>
                </span>
                {freeTicketTotal > 10 && (
                  <span>Maximum 10 public free tickets per event allowed.</span>
                )}
              </div>
              {fieldErrors.tickets && <p className="form-error">{fieldErrors.tickets}</p>}
              {data.tickets.length === 0 && (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600 mb-4">
                  <p className="font-semibold text-neutral-900 mb-1">
                    No public ticket categories added yet
                  </p>
                  <p className="m-0">
                    Click &ldquo;+ Add ticket category&rdquo; below to create your own categories
                    (for example: Early Bird, Regular, VIP, or Table for 4). AZORTIX never
                    auto-creates default ticket categories.
                  </p>
                </div>
              )}
              <div className="ticket-editor-list">
                {data.tickets.map((ticket: any, index: number) => {
                  const isFree = ticket.ticketKind === 'free'
                  return (
                    <article className="ticket-editor" key={ticket.id || index}>
                      <header>
                        <b>
                          Category {index + 1} · {isFree ? 'Free (₦0)' : 'Paid'}
                        </b>
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
                      </header>
                      <div className="wizard-grid">
                        <label>
                          Pricing tier
                          <select
                            value={isFree ? 'free' : 'paid'}
                            onChange={(e) => updateTicket(index, 'ticketKind', e.target.value)}
                          >
                            <option value="paid">Paid Ticket (NGN)</option>
                            <option value="free">Free Ticket (₦0 · max 10 total)</option>
                          </select>
                        </label>
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
                          {isFree ? (
                            <div className="locked-free-price">
                              <Lock size={14} />
                              <span>₦0 (Free Ticket)</span>
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              required
                              value={ticket.price}
                              onChange={(e) => updateTicket(index, 'price', Number(e.target.value))}
                            />
                          )}
                        </label>
                        <label>
                          Quantity {isFree ? '(counts toward 10 free max)' : ''}
                          <input
                            type="number"
                            min="1"
                            max={isFree ? 10 : undefined}
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
                            <option value="group">Group / Table</option>
                          </select>
                        </label>
                        {ticket.ticketMode === 'group' && (
                          <label>
                            People per pass
                            <input
                              type="number"
                              min="2"
                              max="50"
                              required
                              value={ticket.groupSize || 2}
                              onChange={(e) =>
                                updateTicket(index, 'groupSize', Math.max(2, Number(e.target.value) || 2))
                              }
                            />
                          </label>
                        )}
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
                  )
                })}
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
                  <h3>Ready to publish?</h3>
                  <p>
                    Review your details, event URL, and ticket allocations before publishing your
                    event live or submitting for staff review.
                  </p>
                </div>
              </div>
              {heroImage?.url && (
                <div className="mb-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 max-h-[220px]">
                  <img
                    src={heroImage.url}
                    alt={`${data.title || 'Event'} cover preview`}
                    referrerPolicy="no-referrer"
                    className="h-[200px] w-full object-cover"
                  />
                </div>
              )}
              <div className="review-summary">
                <div>
                  <span>Event</span>
                  <b>{data.title || 'Untitled event'}</b>
                  <p>
                    {data.category} · {data.eventFormat} · {data.visibility}
                  </p>
                  <p>/events/{activeSlug || 'auto-generated'}</p>
                </div>
                <div>
                  <span>Schedule</span>
                  <b>
                    {data.startsAt ? formatDateTime(data.startsAt, data.timezone) : 'Not set'}
                  </b>
                  <p>{data.venue || 'Venue not set'}, Abuja</p>
                </div>
                <div>
                  <span>Inventory</span>
                  <b>
                    {data.tickets.length} categories · {ticketTotal} tickets
                  </b>
                  <p>
                    Free allocated: {freeTicketTotal}/10 · 5% organizer commission
                  </p>
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
                {fieldErrors.refundPolicy && (
                  <small className="field-error-text">{fieldErrors.refundPolicy}</small>
                )}
              </label>
              <div className="approval-note">
                <b>
                  {reviewStatus === 'approved'
                    ? 'Approved · Publish live on AZORTIX'
                    : 'Admin approval required before going live'}
                </b>
                <p>
                  {reviewStatus === 'approved'
                    ? `This event is approved by AZORTIX administration. Publish now to make https://azortix.com/events/${activeSlug || '...'} live immediately.`
                    : `Every new event must be reviewed and approved by an AZORTIX Admin before appearing publicly at https://azortix.com/events/${activeSlug || '...'}.`}
                </p>
                {reviewStatus === 'rejected' && reviewNote && (
                  <p className="field-error-text">Admin review note: {reviewNote}</p>
                )}
              </div>
              <div className="wizard-publish-actions">
                {reviewStatus === 'approved' ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="button button-coral full"
                      onClick={() => save({ publish: true })}
                    >
                      {busy ? 'Publishing…' : 'Publish event'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="button button-dark full"
                      onClick={() => save({ submit: false, publish: false })}
                    >
                      {busy ? 'Saving…' : 'Save as draft'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="button button-coral full"
                      onClick={() => save({ submit: true })}
                    >
                      {busy
                        ? 'Submitting…'
                        : reviewStatus === 'pending'
                          ? 'Update pending submission'
                          : reviewStatus === 'rejected'
                            ? 'Resubmit for Admin Approval'
                            : 'Submit for Admin Approval'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="button button-dark full"
                      onClick={() => save({ submit: false, publish: false })}
                    >
                      {busy ? 'Saving…' : 'Save Draft'}
                    </button>
                  </>
                )}
              </div>
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
