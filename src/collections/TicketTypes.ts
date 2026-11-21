import type { CollectionConfig, Where } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eventOwned, getAppUser, getOwnedEventIdsForUser, isStaff } from '@/access/appAccess'

export const TicketTypes: CollectionConfig = {
  slug: 'ticket-types',
  admin: { group: 'Ticketing', useAsTitle: 'name' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: async ({ req }) => {
      const user = getAppUser(req.user)
      if (isStaff(user)) return true
      const publicCondition: Where = {
        and: [
          { active: { equals: true } },
          { visibility: { not_equals: 'invite-only' } },
          { salesStatus: { not_in: ['paused', 'sold-out'] } },
          { 'event._status': { equals: 'published' } },
        ],
      }
      if (user) {
        const ownedIds = await getOwnedEventIdsForUser(req, user.id)
        if (ownedIds.length === 0) return publicCondition
        return {
          or: [{ event: { in: ownedIds } }, publicCondition],
        } as Where
      }
      return publicCondition
    },
    update: eventOwned,
    delete: eventOwned,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const user = getAppUser(req.user)
        const eventId =
          typeof data.event === 'object' && data.event !== null
            ? data.event.id
            : (data.event ?? (typeof originalDoc?.event === 'object' ? originalDoc.event?.id : originalDoc?.event))
        if (user && !isStaff(user) && eventId) {
          await req.payload.findByID({
            collection: 'events',
            id: eventId,
            overrideAccess: false,
            user: req.user,
            depth: 0,
            draft: true,
          })
        }

        const requestedKind = data.ticketKind ?? originalDoc?.ticketKind
        const resolvedPrice =
          data.price !== undefined ? Number(data.price) : Number(originalDoc?.price ?? 0)
        const isFree = requestedKind === 'free' || resolvedPrice === 0

        if (isFree) {
          data.ticketKind = 'free'
          data.price = 0
          const requestedQty =
            data.quantity !== undefined ? Number(data.quantity) : Number(originalDoc?.quantity ?? 0)
          if (!Number.isInteger(requestedQty) || requestedQty < 1) {
            throw new Error('Free ticket quantity must be at least 1.')
          }
          if (eventId) {
            const existingTickets = await req.payload.find({
              collection: 'ticket-types',
              overrideAccess: true,
              where: { event: { equals: eventId } },
              limit: 500,
              depth: 0,
            })
            const otherFreeQty = existingTickets.docs
              .filter(
                (t: any) =>
                  String(t.id) !== String(originalDoc?.id ?? '') &&
                  (t.ticketKind === 'free' || Number(t.price) === 0),
              )
              .reduce((sum: number, t: any) => sum + Number(t.quantity || 0), 0)
            if (otherFreeQty + requestedQty > 10) {
              throw new Error(
                `Free ticket allocation cannot exceed 10 tickets per event (requested total: ${otherFreeQty + requestedQty}/10).`,
              )
            }
          }
        } else {
          data.ticketKind = 'paid'
          if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
            throw new Error('Paid ticket price must be greater than ₦0, or mark the ticket as Free.')
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        revalidateTag('public-events', { expire: 0 })
        const eventId = typeof doc.event === 'object' ? doc.event?.id : doc.event
        if (eventId) {
          const event = await req.payload
            .findByID({ collection: 'events', id: eventId, overrideAccess: true, draft: true, depth: 0 })
            .catch(() => null)
          if (event?.slug) {
            revalidateTag(`event:${event.slug}`, { expire: 0 })
            revalidatePath(`/events/${event.slug}`)
          }
        }
        revalidatePath('/')
        revalidatePath('/discover')
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        revalidateTag('public-events', { expire: 0 })
        const eventId = typeof doc.event === 'object' ? doc.event?.id : doc.event
        if (eventId) {
          const event = await req.payload
            .findByID({ collection: 'events', id: eventId, overrideAccess: true, draft: true, depth: 0 })
            .catch(() => null)
          if (event?.slug) {
            revalidateTag(`event:${event.slug}`, { expire: 0 })
            revalidatePath(`/events/${event.slug}`)
          }
        }
        revalidatePath('/')
        revalidatePath('/discover')
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'ticketKind',
      type: 'select',
      defaultValue: 'paid',
      options: ['paid', 'free'],
    },
    { name: 'description', type: 'text' },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'maxPerOrder', type: 'number', required: true, defaultValue: 8, min: 1 },
    { name: 'minPerOrder', type: 'number', defaultValue: 1, min: 1 },
    {
      name: 'preset',
      type: 'select',
      defaultValue: 'general',
      options: ['early-bird', 'general', 'vip', 'table', 'custom'],
    },
    { name: 'salesOpenAt', type: 'date' },
    { name: 'salesCloseAt', type: 'date' },
    { name: 'perks', type: 'array', fields: [{ name: 'perk', type: 'text', required: true }] },
    { name: 'ticketMode', type: 'select', defaultValue: 'single', options: ['single', 'group'] },
    { name: 'groupSize', type: 'number', min: 2 },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      options: ['public', 'invite-only'],
    },
    {
      name: 'salesStatus',
      type: 'select',
      defaultValue: 'active',
      options: ['active', 'paused', 'sold-out'],
    },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
  ],
}
