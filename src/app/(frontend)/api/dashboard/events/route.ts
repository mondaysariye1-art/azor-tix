import { getCurrentAppUser } from '@/lib/app-auth'
import { generateUniqueEventSlug } from '@/lib/event-slugs'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer')
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  try {
    const form = await request.formData()
    const text = (name: string) => String(form.get(name) || '').trim()
    const title = text('title')
    const description = text('description')
    const startsAt = new Date(text('startsAt'))
    const endsAt = new Date(text('endsAt'))
    const capacity = Number(text('capacity'))
    const ticketPrice = Number(text('ticketPrice'))
    const ticketQuantity = Number(text('ticketQuantity'))
    const image = form.get('image')
    if (
      title.length < 3 ||
      description.length < 30 ||
      !Number.isFinite(startsAt.valueOf()) ||
      !Number.isFinite(endsAt.valueOf()) ||
      endsAt <= startsAt ||
      capacity < 1 ||
      ticketPrice < 0 ||
      ticketQuantity < 1 ||
      !(image instanceof File) ||
      image.size > 8_000_000 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)
    ) {
      return Response.json(
        { error: 'Check the event dates, image, capacity, description, and ticket details.' },
        { status: 400 },
      )
    }
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
    const category = text('category')
    if (!categories.includes(category as (typeof categories)[number]))
      return Response.json({ error: 'Choose a valid category.' }, { status: 400 })
    const payload = await getPayloadClient()
    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: `${title} event artwork` },
      file: {
        data: Buffer.from(await image.arrayBuffer()),
        mimetype: image.type,
        name: image.name,
        size: image.size,
      },
    })
    const publish = text('publish') === 'true'
    const slug = await generateUniqueEventSlug(payload, title)
    const eventData = {
      organizer: user.id,
      title,
      slug,
      category: category as (typeof categories)[number],
      heroImage: media.id,
      description,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      venue: text('venue'),
      address: text('address'),
      city: 'Abuja',
      capacity,
      checkInStatus: 'closed' as const,
      reviewStatus: publish ? ('approved' as const) : ('draft' as const),
    }
    const event = publish
      ? await payload.create({
          collection: 'events',
          overrideAccess: false,
          user,
          draft: false,
          data: eventData,
        })
      : await payload.create({
          collection: 'events',
          overrideAccess: false,
          user,
          draft: true,
          data: eventData,
        })
    await payload.create({
      collection: 'ticket-types',
      overrideAccess: false,
      user,
      data: {
        event: event.id,
        name: text('ticketName') || 'General admission',
        price: ticketPrice,
        quantity: ticketQuantity,
        maxPerOrder: 8,
        active: true,
      },
    })
    return Response.json({
      eventId: event.id,
      slug: event.slug,
      eventUrl: event.slug ? `/events/${event.slug}` : undefined,
      status: event._status,
      message: publish ? 'Event published.' : 'Event saved as a draft.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'The event could not be created.' },
      { status: 400 },
    )
  }
}
