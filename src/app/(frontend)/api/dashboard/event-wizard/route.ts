import { revalidatePath } from 'next/cache'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { slugifyEventTitle } from '@/lib/event-slugs'
import { resolveTimeZone } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { resolvePublicOrigin } from '@/lib/paystack'

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
] as const
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function detectImageMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function cleanText(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanDate(value: unknown) {
  const date = new Date(typeof value === 'string' ? value : '')
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined
}

const SUSPICIOUS_DEV_PATTERNS = [
  /```/,
  /\b(DROP\s+TABLE|ALTER\s+TABLE|SELECT\s+\*\s+FROM|INSERT\s+INTO)\b/i,
  /\b(npx\s+|pnpm\s+|npm\s+run|tsx\s+-e)\b/i,
  /\b(AIS_METADATA_SECTION|tool_call|console\.log\(|process\.env\.)\b/i,
  /\b(I have updated|I've updated|Let me inspect|I will now fix)\b/i,
]

function validateEventTextFields(fields: {
  title: string
  venue: string
  address: string
  description: string
}): { error: string; missingStep: number; fieldErrors: Record<string, string> } | null {
  const checks: Array<{ key: 'title' | 'venue' | 'address' | 'description'; value: string; step: number; label: string }> = [
    { key: 'title', value: fields.title, step: 1, label: 'Event title' },
    { key: 'description', value: fields.description, step: 1, label: 'Event description' },
    { key: 'venue', value: fields.venue, step: 2, label: 'Venue name' },
    { key: 'address', value: fields.address, step: 2, label: 'Venue address' },
  ]
  for (const item of checks) {
    if (!item.value) continue
    if (SUSPICIOUS_DEV_PATTERNS.some((pattern) => pattern.test(item.value))) {
      return {
        error: `${item.label} appears to contain pasted code or technical text. Please enter real attendee-facing event details.`,
        missingStep: item.step,
        fieldErrors: { [item.key]: `Enter a real ${item.label.toLowerCase()} for attendees.` },
      }
    }
  }
  const normVenue = fields.venue.toLowerCase().replace(/\s+/g, ' ').trim()
  const normAddress = fields.address.toLowerCase().replace(/\s+/g, ' ').trim()
  const normDesc = fields.description.toLowerCase().replace(/\s+/g, ' ').trim()
  if (normVenue.length >= 25 && normVenue === normDesc) {
    return {
      error: 'Venue name and full event description cannot be identical pasted text. Enter a concise venue name and a separate event description.',
      missingStep: 2,
      fieldErrors: { venue: 'Enter only the venue name here, not the full event description.' },
    }
  }
  if (normAddress.length >= 40 && normAddress === normDesc) {
    return {
      error: 'Venue street address and full event description cannot be identical pasted text.',
      missingStep: 2,
      fieldErrors: { address: 'Enter the Abuja street address here, not the full event description.' },
    }
  }
  return null
}

async function uploadImage(payload: any, file: File, alt: string) {
  if (!file.size) {
    throw new Error('Selected image file is empty. Choose a valid JPG, PNG, or WebP image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be under 10 MB. Compress or resize the photo and try again.')
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const detectedMime = detectImageMime(buffer)
  if (!detectedMime) {
    throw new Error('Unsupported or corrupted image file. Upload a valid JPG, PNG, or WebP image.')
  }
  const ext = detectedMime === 'image/png' ? 'png' : detectedMime === 'image/webp' ? 'webp' : 'jpg'
  const baseName = (file.name || 'event-image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'event-image'

  return payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt },
    file: {
      data: buffer,
      mimetype: detectedMime,
      name: `${baseName}.${ext}`,
      size: buffer.length,
    },
  })
}

const clientRequestLocks = new Map<string, Promise<unknown>>()

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  let form: FormData
  let raw: Record<string, any>
  try {
    form = await request.formData()
    raw = JSON.parse(String(form.get('payload') || '{}')) as Record<string, any>
  } catch {
    return Response.json({ error: 'Invalid event wizard form payload.' }, { status: 400 })
  }

  const isStaff = user.role === 'admin' || user.role === 'super-admin'
  if (
    !isStaff &&
    typeof raw.reviewStatus === 'string' &&
    ['approved', 'rejected', 'cancelled'].includes(raw.reviewStatus)
  ) {
    return Response.json(
      { error: 'Only AZORTIX Admins and Super Admins can approve or change event approval status.' },
      { status: 403 },
    )
  }

  const clientRequestId = cleanText(raw.clientRequestId, 120)
  const lockKey = clientRequestId ? `${user.id}:${clientRequestId}` : ''
  const previousLock = lockKey ? clientRequestLocks.get(lockKey) : undefined
  let releaseLock!: () => void
  const currentLock = new Promise<void>((resolve) => {
    releaseLock = resolve
  })
  const tailLock = previousLock ? previousLock.then(() => currentLock, () => currentLock) : currentLock
  if (lockKey) {
    clientRequestLocks.set(lockKey, tailLock)
  }

  try {
    if (previousLock) {
      await previousLock.catch(() => {})
    }
    const step = Math.max(1, Math.min(6, Number(raw.step) || 1))
    const title = cleanText(raw.title, 140)

    if (title.length < 3 || !categories.includes(raw.category)) {
      return Response.json(
        {
          error: 'Enter an event title (at least 3 characters) and select a valid category.',
          missingStep: 1,
          fieldErrors: {
            ...(title.length < 3 ? { title: 'Event title must be at least 3 characters.' } : {}),
            ...(!categories.includes(raw.category) ? { category: 'Select a category.' } : {}),
          },
        },
        { status: 400 },
      )
    }

    const hygieneIssue = validateEventTextFields({
      title,
      venue: cleanText(raw.venue, 180),
      address: cleanText(raw.address, 300),
      description: cleanText(raw.description),
    })
    if (hygieneIssue) {
      return Response.json(hygieneIssue, { status: 400 })
    }

    const payload = await getPayloadClient()

    let existing: any = null
    if (raw.eventId) {
      existing = await payload
        .findByID({
          collection: 'events',
          id: String(raw.eventId),
          overrideAccess: false,
          user,
          depth: 0,
          draft: true,
        })
        .catch(() => null)
      if (!existing) {
        return Response.json({ error: 'Event draft not found.' }, { status: 404 })
      }
    } else if (clientRequestId) {
      const dupeCheck = await payload.find({
        collection: 'events',
        overrideAccess: true,
        draft: true,
        limit: 1,
        depth: 0,
        where: {
          and: [
            { organizer: { equals: user.id } },
            { clientRequestId: { equals: clientRequestId } },
          ],
        },
      })
      if (dupeCheck.docs[0]) {
        existing = dupeCheck.docs[0]
      }
    }

    let heroImage: string | number | null | undefined
    const cover = form.get('cover')
    if (cover instanceof File && cover.size) {
      heroImage = (await uploadImage(payload, cover, `${title} cover artwork`)).id
    } else if (raw.heroImageId === null || raw.heroImageId === '') {
      heroImage = null
    } else if (typeof raw.heroImageId === 'string' && raw.heroImageId.trim()) {
      const verifiedMedia = await payload
        .findByID({
          collection: 'media',
          id: raw.heroImageId.trim(),
          overrideAccess: true,
          depth: 0,
        })
        .catch(() => null)
      if (!verifiedMedia) {
        return Response.json(
          {
            error: 'The selected cover image could not be found. Please re-upload your cover photo.',
            missingStep: 3,
            fieldErrors: { cover: 'Cover image was not found on the server. Upload again.' },
          },
          { status: 400 },
        )
      }
      heroImage = verifiedMedia.id
    }

    const uploadedGalleryIds: Array<string | number> = []
    for (const file of form.getAll('gallery')) {
      if (file instanceof File && file.size) {
        uploadedGalleryIds.push((await uploadImage(payload, file, `${title} gallery image`)).id)
      }
    }

    let resolvedGalleryIds: Array<string | number> | undefined
    if (Array.isArray(raw.galleryIds)) {
      const verifiedIds: Array<string | number> = []
      for (const rawId of raw.galleryIds.slice(0, 20)) {
        const cleanId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : ''
        if (!cleanId) continue
        const mediaDoc = await payload
          .findByID({ collection: 'media', id: cleanId, overrideAccess: true, depth: 0 })
          .catch(() => null)
        if (mediaDoc) verifiedIds.push(mediaDoc.id)
      }
      resolvedGalleryIds = [...verifiedIds, ...uploadedGalleryIds]
    } else if (uploadedGalleryIds.length > 0) {
      const existingGalleryIds = Array.isArray(existing?.gallery)
        ? existing.gallery.map((item: any) => (typeof item === 'object' && item ? item.id : item)).filter(Boolean)
        : []
      resolvedGalleryIds = [...existingGalleryIds, ...uploadedGalleryIds]
    }

    const attendeeQuestions = Array.isArray(raw.attendeeQuestions)
      ? raw.attendeeQuestions
          .slice(0, 20)
          .map((question: any) => ({
            label: cleanText(question.label, 180),
            type: ['text', 'multiple-choice', 'checkbox', 'date'].includes(question.type)
              ? question.type
              : 'text',
            required: Boolean(question.required),
            options: Array.isArray(question.options)
              ? question.options
                  .slice(0, 20)
                  .map((label: unknown) => ({ label: cleanText(label, 100) }))
                  .filter((item: any) => item.label)
              : [],
          }))
          .filter((question: any) => question.label)
      : []

    const sessions = Array.isArray(raw.sessions)
      ? raw.sessions
          .slice(0, 30)
          .map((session: any) => ({
            name: cleanText(session.name, 120),
            startsAt: cleanDate(session.startsAt),
            endsAt: cleanDate(session.endsAt),
          }))
          .filter((session: any) => session.name && session.startsAt && session.endsAt)
      : []

    const ticketInputs = Array.isArray(raw.tickets) ? raw.tickets.slice(0, 50) : []
    const parsedTickets = ticketInputs.map((ticket: any) => {
      const name = cleanText(ticket.name, 120)
      const ticketKind =
        ticket.ticketKind === 'free' || Number(ticket.price) === 0 ? 'free' : 'paid'
      const price = ticketKind === 'free' ? 0 : Number(ticket.price)
      const quantity = Number(ticket.quantity)
      return {
        raw: ticket,
        id: ticket.id ? String(ticket.id) : undefined,
        name,
        ticketKind,
        price,
        quantity,
      }
    })

    // Enforce free ticket limit of 10 across ALL ticket categories on this event
    const freeTicketTotal = parsedTickets
      .filter((t) => t.name && t.ticketKind === 'free' && Number.isInteger(t.quantity) && t.quantity > 0)
      .reduce((sum, t) => sum + t.quantity, 0)
    if (freeTicketTotal > 10) {
      return Response.json(
        {
          error: `Free ticket allocation cannot exceed 10 tickets per event (currently ${freeTicketTotal}/10 across free ticket categories).`,
          missingStep: 4,
          fieldErrors: {
            tickets: `Total free tickets (${freeTicketTotal}) exceed the maximum of 10 per event.`,
          },
        },
        { status: 400 },
      )
    }

    for (const t of parsedTickets) {
      if (t.name && t.ticketKind === 'paid' && (!Number.isFinite(t.price) || t.price <= 0)) {
        return Response.json(
          {
            error: `Paid ticket "${t.name}" must have a price greater than ₦0, or switch it to Free.`,
            missingStep: 4,
            fieldErrors: { tickets: `Invalid price on "${t.name}".` },
          },
          { status: 400 },
        )
      }
    }

    const wantsPublish = Boolean(raw.publish)
    const submitForReview = Boolean(raw.submit)
    const isAlreadyApproved = existing?.reviewStatus === 'approved'
    const publish = wantsPublish && isAlreadyApproved
    const needsAdminApproval = (wantsPublish || submitForReview) && !isAlreadyApproved
    const wantsValidation = wantsPublish || submitForReview

    const requestedSlugRaw = cleanText(raw.slug, 140)
    const normalizedRequestedSlug = requestedSlugRaw ? slugifyEventTitle(requestedSlugRaw) : ''

    const existingOrganizerId =
      existing?.organizer && typeof existing.organizer === 'object'
        ? existing.organizer.id
        : existing?.organizer
    const keepLivePublished = existing?._status === 'published' && isAlreadyApproved
    const shouldPublishLive = publish || (keepLivePublished && !needsAdminApproval)

    const data: Record<string, any> = {
      organizer: existingOrganizerId || user.id,
      title,
      ...(normalizedRequestedSlug ? { slug: normalizedRequestedSlug } : {}),
      ...(clientRequestId ? { clientRequestId } : {}),
      category: raw.category,
      shortDescription: cleanText(raw.shortDescription, 180),
      description: cleanText(raw.description),
      eventFormat: ['physical', 'virtual', 'hybrid'].includes(raw.eventFormat)
        ? raw.eventFormat
        : 'physical',
      visibility: raw.visibility === 'private' ? 'private' : 'public',
      ageRestriction: ['all-ages', '13+', '16+', '18+', '21+'].includes(raw.ageRestriction)
        ? raw.ageRestriction
        : 'all-ages',
      startsAt: cleanDate(raw.startsAt),
      endsAt: cleanDate(raw.endsAt),
      timezone: resolveTimeZone(raw.timezone || existing?.timezone),
      country: 'Nigeria',
      state: 'FCT',
      city: 'Abuja',
      venue: cleanText(raw.venue, 180),
      address: cleanText(raw.address, 300),
      virtualLink: cleanText(raw.virtualLink, 500),
      scheduleType: ['single', 'recurring', 'multiple'].includes(raw.scheduleType)
        ? raw.scheduleType
        : 'single',
      sessions,
      videoURL: cleanText(raw.videoURL, 500),
      pageAppearance: ['light', 'dark', 'turquoise'].includes(raw.pageAppearance)
        ? raw.pageAppearance
        : 'light',
      contactName: cleanText(raw.contactName, 120),
      contactEmail: cleanText(raw.contactEmail, 180).toLowerCase(),
      contactPhone: cleanText(raw.contactPhone, 40),
      attendeeQuestions,
      terms: cleanText(raw.terms),
      entryRequirements: cleanText(raw.entryRequirements),
      refundPolicy: cleanText(raw.refundPolicy),
      capacity: Number(raw.capacity) > 0 ? Math.floor(Number(raw.capacity)) : undefined,
      wizardStep: step,
      reviewStatus: isAlreadyApproved
        ? 'approved'
        : needsAdminApproval
          ? 'pending'
          : existing?.reviewStatus || 'draft',
      ...(needsAdminApproval ? { submittedAt: new Date().toISOString() } : {}),
      _status: shouldPublishLive ? 'published' : 'draft',
      ...(heroImage !== undefined
        ? { heroImage }
        : existing?.heroImage
          ? {
              heroImage:
                typeof existing.heroImage === 'object' ? existing.heroImage.id : existing.heroImage,
            }
          : {}),
      ...(resolvedGalleryIds !== undefined
        ? { gallery: resolvedGalleryIds }
        : Array.isArray(existing?.gallery) && existing.gallery.length
          ? {
              gallery: existing.gallery
                .map((item: any) => (typeof item === 'object' && item ? item.id : item))
                .filter(Boolean),
            }
          : {}),
    }

    if (wantsValidation) {
      const hasCover = Boolean(data.heroImage)
      const startsAt = cleanDate(raw.startsAt)
      const endsAt = cleanDate(raw.endsAt)
      const validTickets = parsedTickets.filter(
        (t) =>
          t.name.length >= 1 &&
          Number.isInteger(t.quantity) &&
          t.quantity >= 1 &&
          ((t.ticketKind === 'free' && t.price === 0) || (t.ticketKind === 'paid' && t.price > 0)),
      )

      const fieldErrors: Record<string, string> = {}
      let missingStep: number | null = null

      if (data.description.length < 30) {
        fieldErrors.description = 'Full description must be at least 30 characters (Step 1).'
        missingStep = missingStep ?? 1
      }
      if (!startsAt) {
        fieldErrors.startsAt = 'Select an event start date and time (Step 2).'
        missingStep = missingStep ?? 2
      }
      if (!endsAt || (startsAt && new Date(endsAt) <= new Date(startsAt))) {
        fieldErrors.endsAt = 'End date/time must be after start date/time (Step 2).'
        missingStep = missingStep ?? 2
      }
      if (!data.venue || data.venue.length < 2) {
        fieldErrors.venue = 'Enter the event venue (Step 2).'
        missingStep = missingStep ?? 2
      }
      if (!data.address || data.address.length < 3) {
        fieldErrors.address = 'Enter the venue street address (Step 2).'
        missingStep = missingStep ?? 2
      }
      if (!data.capacity || data.capacity < 1) {
        fieldErrors.capacity = 'Enter event capacity (Step 2).'
        missingStep = missingStep ?? 2
      }
      if (!hasCover) {
        fieldErrors.cover = 'Upload a cover image (Step 3).'
        missingStep = missingStep ?? 3
      }
      if (validTickets.length === 0) {
        fieldErrors.tickets = 'Add at least one valid paid or free ticket category (Step 4).'
        missingStep = missingStep ?? 4
      }
      if (!data.refundPolicy || data.refundPolicy.length < 10) {
        fieldErrors.refundPolicy = 'Enter a clear refund policy (at least 10 characters in Step 6).'
        missingStep = missingStep ?? 6
      }

      if (missingStep !== null) {
        const firstReason = Object.values(fieldErrors)[0]
        return Response.json(
          {
            error: firstReason || 'Complete all required fields across the six steps before publishing.',
            missingStep,
            fieldErrors,
          },
          { status: 400 },
        )
      }
    }

    const event = existing
      ? await payload.update({
          collection: 'events',
          id: existing.id,
          overrideAccess: false,
          user,
          draft: !shouldPublishLive,
          depth: 1,
          data: data as any,
        })
      : shouldPublishLive
        ? await payload.create({
            collection: 'events',
            overrideAccess: false,
            user,
            draft: false,
            depth: 1,
            data: data as any,
          })
        : await payload.create({
            collection: 'events',
            overrideAccess: false,
            user,
            draft: true,
            depth: 1,
            data: data as any,
          })

    if (shouldPublishLive) {
      revalidatePath('/')
      revalidatePath('/discover')
      if (event.slug) revalidatePath(`/events/${event.slug}`)
    }

    // Confirm persisted status in DB when publishing an approved event
    if (publish && event._status !== 'published') {
      return Response.json(
        {
          error: 'The event was saved as a draft, but publication did not confirm in the database.',
          missingStep: 6,
        },
        { status: 500 },
      )
    }

    // Sync tickets cleanly: delete/retire unkept categories first, then apply reductions before increases/creates
    const existingTicketsResult = await payload.find({
      collection: 'ticket-types',
      overrideAccess: true,
      where: { event: { equals: event.id } },
      limit: 200,
      depth: 0,
    })
    const existingTicketsById = new Map<string, any>(
      existingTicketsResult.docs.map((doc: any) => [String(doc.id), doc]),
    )
    const keptTicketIds = new Set<string>(
      parsedTickets
        .map((p) => p.id)
        .filter((id): id is string => Boolean(id && existingTicketsById.has(id))),
    )

    for (const [oldId] of existingTicketsById.entries()) {
      if (!keptTicketIds.has(oldId)) {
        const issuedCount = await payload.count({
          collection: 'tickets',
          overrideAccess: true,
          where: { ticketType: { equals: oldId } },
        })
        if (issuedCount.totalDocs === 0) {
          await payload.delete({
            collection: 'ticket-types',
            id: oldId,
            overrideAccess: true,
          })
        } else {
          await payload.update({
            collection: 'ticket-types',
            id: oldId,
            overrideAccess: true,
            data: { active: false, salesStatus: 'paused' },
          })
        }
      }
    }

    const indexedParsed = parsedTickets
      .map((parsed, idx) => ({ parsed, idx }))
      .filter(({ parsed }) => {
        const { name, price, quantity } = parsed
        return Boolean(
          name && Number.isFinite(price) && price >= 0 && Number.isInteger(quantity) && quantity >= 1,
        )
      })

    // Sort: existing updates reducing free qty first, other updates second, creates last
    indexedParsed.sort((a, b) => {
      const aExisting = a.parsed.id ? existingTicketsById.get(a.parsed.id) : undefined
      const bExisting = b.parsed.id ? existingTicketsById.get(b.parsed.id) : undefined
      const score = (parsed: any, ex: any) => {
        if (!ex) return 2
        const oldFree =
          ex.ticketKind === 'free' || Number(ex.price) === 0 ? Number(ex.quantity || 0) : 0
        const newFree = parsed.ticketKind === 'free' ? parsed.quantity : 0
        return newFree <= oldFree ? 0 : 1
      }
      return score(a.parsed, aExisting) - score(b.parsed, bExisting)
    })

    const savedByIndex = new Map<number, any>()

    for (const { parsed, idx } of indexedParsed) {
      const { raw: ticket, name, ticketKind, price, quantity } = parsed
      const ticketData: any = {
        event: event.id,
        name,
        ticketKind,
        description: cleanText(ticket.description, 500),
        price: ticketKind === 'free' ? 0 : price,
        quantity,
        minPerOrder: Math.max(1, Math.floor(Number(ticket.minPerOrder) || 1)),
        maxPerOrder: Math.max(1, Math.floor(Number(ticket.maxPerOrder) || 8)),
        preset: ['early-bird', 'general', 'vip', 'table', 'custom'].includes(ticket.preset)
          ? ticket.preset
          : 'custom',
        salesOpenAt: cleanDate(ticket.salesOpenAt),
        salesCloseAt: cleanDate(ticket.salesCloseAt),
        perks: Array.isArray(ticket.perks)
          ? ticket.perks
              .map((perk: unknown) => ({ perk: cleanText(perk, 120) }))
              .filter((item: any) => item.perk)
          : [],
        ticketMode: ticket.ticketMode === 'group' ? 'group' : 'single',
        groupSize:
          ticket.ticketMode === 'group' ? Math.max(2, Number(ticket.groupSize) || 2) : undefined,
        visibility: ticket.visibility === 'invite-only' ? 'invite-only' : 'public',
        salesStatus: ['active', 'paused', 'sold-out'].includes(ticket.salesStatus)
          ? ticket.salesStatus
          : 'active',
        active: ticket.salesStatus !== 'paused',
      }
      if (parsed.id && existingTicketsById.has(parsed.id)) {
        const updatedTicket = await payload.update({
          collection: 'ticket-types',
          id: parsed.id,
          overrideAccess: false,
          user,
          depth: 0,
          data: ticketData,
        })
        savedByIndex.set(idx, updatedTicket)
      } else {
        const createdTicket = await payload.create({
          collection: 'ticket-types',
          overrideAccess: false,
          user,
          depth: 0,
          data: ticketData,
        })
        savedByIndex.set(idx, createdTicket)
      }
    }

    const savedTickets: any[] = indexedParsed
      .slice()
      .sort((a, b) => a.idx - b.idx)
      .map(({ idx }) => savedByIndex.get(idx))
      .filter(Boolean)

    const origin = resolvePublicOrigin(request)
    let emailStatus: any = undefined
    if (publish) {
      await logAudit({
        payload,
        action: 'event.published',
        category: 'event',
        actor: user as any,
        targetCollection: 'events',
        targetId: event.id,
        summary: `Event "${event.title}" published at /events/${event.slug}.`,
      })
      emailStatus = await sendTransactionalEmail({
        payload,
        to: user.email,
        subject: `Event Published: ${event.title} — AZORTIX`,
        title: 'Your event is now live on AZORTIX',
        bodyHtml: `<p><strong>${event.title}</strong> is published and accepting attendees.</p><p>Public URL: <a href="${origin}/events/${event.slug}">${origin}/events/${event.slug}</a></p>`,
        text: `${event.title} is now live at ${origin}/events/${event.slug}`,
      })
    } else if (needsAdminApproval) {
      await logAudit({
        payload,
        action: 'event.submitted_for_review',
        category: 'event',
        actor: user as any,
        targetCollection: 'events',
        targetId: event.id,
        summary: `Event "${event.title}" submitted for AZORTIX admin approval.`,
      })
      emailStatus = await sendTransactionalEmail({
        payload,
        to: user.email,
        subject: `Event Submitted for Approval: ${event.title} — AZORTIX`,
        title: 'Your event is awaiting AZORTIX admin approval',
        bodyHtml: `<p><strong>${event.title}</strong> has been saved and submitted for AZORTIX admin review.</p><p>Once approved by an admin, it will immediately go live at <a href="${origin}/events/${event.slug}">${origin}/events/${event.slug}</a>.</p>`,
        text: `${event.title} has been submitted for AZORTIX admin approval and will appear publicly once approved.`,
      })
    }

    const persistedHero =
      event.heroImage && typeof event.heroImage === 'object' && (event.heroImage as any).url
        ? {
            id: String((event.heroImage as any).id),
            url: String((event.heroImage as any).url),
            filename: String((event.heroImage as any).filename || ''),
          }
        : null
    const persistedGallery = Array.isArray(event.gallery)
      ? event.gallery
          .filter((item: any) => item && typeof item === 'object' && item.url)
          .map((item: any) => ({
            id: String(item.id),
            url: String(item.url),
            filename: String(item.filename || ''),
          }))
      : []

    const eventUrl = event.slug ? `/events/${event.slug}` : undefined
    return Response.json({
      eventId: event.id,
      slug: event.slug,
      title: event.title,
      status: event._status,
      reviewStatus: event.reviewStatus,
      requiresApproval: event.reviewStatus !== 'approved',
      eventUrl,
      heroImage: persistedHero,
      gallery: persistedGallery,
      emailStatus,
      tickets: savedTickets.map((ticket: any) => ({
        id: String(ticket.id),
        name: ticket.name,
        ticketKind: ticket.ticketKind || (Number(ticket.price) === 0 ? 'free' : 'paid'),
        description: ticket.description || '',
        price: Number(ticket.price || 0),
        quantity: Number(ticket.quantity || 1),
        minPerOrder: Number(ticket.minPerOrder || 1),
        maxPerOrder: Number(ticket.maxPerOrder || 8),
        preset: ticket.preset || 'custom',
        salesOpenAt: ticket.salesOpenAt?.slice(0, 16) || '',
        salesCloseAt: ticket.salesCloseAt?.slice(0, 16) || '',
        perks: (ticket.perks || []).map((item: any) => item.perk),
        ticketMode: ticket.ticketMode || 'single',
        groupSize: ticket.groupSize || 2,
        visibility: ticket.visibility || 'public',
        salesStatus: ticket.salesStatus || 'active',
      })),
      message: publish
        ? 'Event published and live!'
        : shouldPublishLive
          ? `Step ${step} saved and live event updated.`
          : needsAdminApproval
            ? 'Event submitted for AZORTIX admin approval! It will appear on AZORTIX once approved by an admin.'
            : `Step ${step} saved.`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'The event draft could not be saved.' },
      { status: 400 },
    )
  } finally {
    releaseLock()
    if (lockKey && clientRequestLocks.get(lockKey) === tailLock) {
      clientRequestLocks.delete(lockKey)
    }
  }
}
