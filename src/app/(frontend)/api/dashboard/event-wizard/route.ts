import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

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
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

function cleanText(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanDate(value: unknown) {
  const date = new Date(typeof value === 'string' ? value : '')
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined
}

async function uploadImage(payload: any, file: File, alt: string) {
  if (file.size > 8_000_000 || !imageTypes.includes(file.type))
    throw new Error('Images must be JPG, PNG, or WebP under 8 MB.')
  return payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt },
    file: {
      data: Buffer.from(await file.arrayBuffer()),
      mimetype: file.type,
      name: file.name,
      size: file.size,
    },
  })
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const raw = JSON.parse(String(form.get('payload') || '{}')) as Record<string, any>
    const step = Math.max(1, Math.min(6, Number(raw.step) || 1))
    const title = cleanText(raw.title, 140)
    if (title.length < 3 || !categories.includes(raw.category)) {
      return Response.json(
        { error: 'Add a title and valid category before saving.' },
        { status: 400 },
      )
    }
    const payload = await getPayloadClient()

    let existing: any = null
    if (raw.eventId) {
      existing = await payload.findByID({
        collection: 'events',
        id: String(raw.eventId),
        overrideAccess: false,
        user,
        depth: 0,
        draft: true,
      })
    }

    let heroImage: string | number | undefined
    const cover = form.get('cover')
    if (cover instanceof File && cover.size) {
      heroImage = (await uploadImage(payload, cover, `${title} cover artwork`)).id
    }
    const gallery: Array<string | number> = []
    for (const file of form.getAll('gallery')) {
      if (file instanceof File && file.size)
        gallery.push((await uploadImage(payload, file, `${title} gallery image`)).id)
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

    const publish = Boolean(raw.publish)
    const submitForReview = Boolean(raw.submit)
    const wantsValidation = publish || submitForReview

    const data: Record<string, any> = {
      organizer: user.id,
      title,
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
      reviewStatus: publish
        ? 'approved'
        : submitForReview
          ? 'pending'
          : existing?.reviewStatus || 'draft',
      _status: publish ? 'published' : 'draft',
      ...(heroImage ? { heroImage } : {}),
      ...(gallery.length
        ? { gallery: [...(Array.isArray(existing?.gallery) ? existing.gallery : []), ...gallery] }
        : {}),
    }

    if (wantsValidation) {
      const hasCover = Boolean(heroImage || existing?.heroImage)
      const startsAt = cleanDate(raw.startsAt)
      const endsAt = cleanDate(raw.endsAt)
      if (
        !hasCover ||
        data.description.length < 30 ||
        !startsAt ||
        !endsAt ||
        new Date(endsAt) <= new Date(startsAt) ||
        !data.venue ||
        !data.address ||
        !data.capacity ||
        !data.refundPolicy ||
        !Array.isArray(raw.tickets) ||
        !raw.tickets.some(
          (ticket: any) =>
            cleanText(ticket.name) && Number(ticket.quantity) > 0 && Number(ticket.price) >= 0,
        )
      ) {
        return Response.json(
          {
            error:
              'Complete all six steps, including cover, dates, venue, capacity, description, ticket category, and refund policy.',
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
          draft: !publish,
          data: data as any,
        })
      : publish
        ? await payload.create({
            collection: 'events',
            overrideAccess: false,
            user,
            draft: false,
            data: data as any,
          })
        : await payload.create({
            collection: 'events',
            overrideAccess: false,
            user,
            draft: true,
            data: data as any,
          })

    const ticketInputs = Array.isArray(raw.tickets) ? raw.tickets.slice(0, 50) : []
    const savedTickets: any[] = []
    for (const ticket of ticketInputs) {
      const name = cleanText(ticket.name, 120)
      const price = Number(ticket.price)
      const quantity = Number(ticket.quantity)
      if (
        !name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      )
        continue
      const ticketData: any = {
        event: event.id,
        name,
        description: cleanText(ticket.description, 500),
        price,
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
      if (ticket.id) {
        const updatedTicket = await payload.update({
          collection: 'ticket-types',
          id: ticket.id,
          overrideAccess: false,
          user,
          data: ticketData,
        })
        savedTickets.push(updatedTicket)
      } else {
        const createdTicket = await payload.create({
          collection: 'ticket-types',
          overrideAccess: false,
          user,
          data: ticketData,
        })
        savedTickets.push(createdTicket)
      }
    }

    const eventUrl = event.slug ? `/events/${event.slug}` : undefined
    return Response.json({
      eventId: event.id,
      slug: event.slug,
      title: event.title,
      status: event._status,
      reviewStatus: event.reviewStatus,
      eventUrl,
      tickets: savedTickets.map((ticket: any) => ({
        ...ticket,
        salesOpenAt: ticket.salesOpenAt?.slice(0, 16) || '',
        salesCloseAt: ticket.salesCloseAt?.slice(0, 16) || '',
        perks: (ticket.perks || []).map((item: any) => item.perk),
      })),
      message: publish
        ? 'Event published and live.'
        : submitForReview
          ? 'Event submitted for AZOR TIX approval.'
          : `Step ${step} saved.`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'The event draft could not be saved.' },
      { status: 400 },
    )
  }
}
