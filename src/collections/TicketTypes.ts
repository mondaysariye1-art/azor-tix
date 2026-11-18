import type { CollectionConfig, Where } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { eventOwned, getAppUser, isStaff } from '@/access/appAccess'

export const TicketTypes: CollectionConfig = {
  slug: 'ticket-types',
  admin: { group: 'Ticketing', useAsTitle: 'name' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: ({ req }) => {
      const user = getAppUser(req.user)
      if (isStaff(user)) return true
      if (user)
        return {
          or: [
            { 'event.organizer': { equals: user.id } },
            {
              and: [
                { active: { equals: true } },
                { visibility: { not_equals: 'invite-only' } },
                { salesStatus: { not_in: ['paused', 'sold-out'] } },
                { 'event._status': { equals: 'published' } },
              ],
            },
          ],
        } as Where
      return {
        and: [
          { active: { equals: true } },
          { visibility: { not_equals: 'invite-only' } },
          { salesStatus: { not_in: ['paused', 'sold-out'] } },
          { 'event._status': { equals: 'published' } },
        ],
      } as Where
    },
    update: eventOwned,
    delete: eventOwned,
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const user = getAppUser(req.user)
        if (!user || isStaff(user)) return data
        await req.payload.findByID({
          collection: 'events',
          id: data.event,
          overrideAccess: false,
          user: req.user,
          depth: 0,
          draft: true,
        })
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
