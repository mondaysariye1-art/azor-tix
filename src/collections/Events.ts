import type { CollectionConfig, Where } from 'payload'
import { getAppUser, isStaff } from '@/access/appAccess'
import { revalidatePath, revalidateTag } from 'next/cache'
import { generateUniqueEventSlug } from '@/lib/event-slugs'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    group: 'Ticketing',
    useAsTitle: 'title',
    defaultColumns: ['title', 'venue', 'startsAt', '_status'],
  },
  versions: {
    drafts: true,
    maxPerDoc: 30,
  },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: ({ req }) => {
      const user = getAppUser(req.user)
      if (isStaff(user)) return true
      if (user)
        return {
          or: [{ organizer: { equals: user.id } }, { _status: { equals: 'published' } }],
        } as Where
      return { _status: { equals: 'published' } } as Where
    },
    update: ({ req }) => {
      const user = getAppUser(req.user)
      if (!user) return false
      if (isStaff(user)) return true
      return { organizer: { equals: user.id } }
    },
    delete: ({ req }) => {
      const user = getAppUser(req.user)
      if (!user) return false
      if (isStaff(user)) return true
      return {
        and: [{ organizer: { equals: user.id } }, { _status: { equals: 'draft' } }],
      } as Where
    },
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        if (!data) return data
        if (operation === 'create') {
          const source = typeof data.slug === 'string' && data.slug.trim() ? data.slug : data.title
          if (source) {
            data.slug = await generateUniqueEventSlug(req.payload, String(source))
          }
        } else if (operation === 'update') {
          const existingSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug.trim() : ''
          const requestedSlug = typeof data.slug === 'string' ? data.slug.trim() : ''
          if (!existingSlug) {
            const source = requestedSlug || data.title || originalDoc?.title
            if (source) {
              data.slug = await generateUniqueEventSlug(req.payload, String(source), originalDoc?.id)
            }
          } else if (!requestedSlug || requestedSlug === existingSlug) {
            data.slug = existingSlug
          } else {
            data.slug = await generateUniqueEventSlug(req.payload, requestedSlug, originalDoc?.id)
          }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) {
          data.organizer = user.id
        }
        if (user && !isStaff(user)) {
          if (data.reviewStatus && ['rejected', 'cancelled'].includes(data.reviewStatus)) {
            throw new Error('Only AZOR TIX staff can reject or cancel an event.')
          }
          if (data.reviewStatus === 'pending') data.submittedAt = new Date().toISOString()
          if (data._status === 'published') {
            if (originalDoc?.reviewStatus === 'rejected' || originalDoc?.reviewStatus === 'cancelled') {
              throw new Error('This event requires AZOR TIX staff approval before publishing.')
            }
            if (data.reviewStatus !== 'pending') {
              data.reviewStatus = 'approved'
            }
          }
        }
        data.country = 'Nigeria'
        data.state = 'FCT'
        data.city = 'Abuja'
        return data
      },
    ],
    afterChange: [
      ({ doc, previousDoc }) => {
        revalidateTag('public-events', { expire: 0 })
        if (previousDoc?.slug) revalidateTag(`event:${previousDoc.slug}`, { expire: 0 })
        if (doc.slug) revalidateTag(`event:${doc.slug}`, { expire: 0 })
        const previousOrganizer =
          typeof previousDoc?.organizer === 'object'
            ? previousDoc.organizer?.id
            : previousDoc?.organizer
        const organizer = typeof doc.organizer === 'object' ? doc.organizer?.id : doc.organizer
        if (previousOrganizer) revalidateTag(`organizer-events:${previousOrganizer}`, { expire: 0 })
        if (organizer) revalidateTag(`organizer-events:${organizer}`, { expire: 0 })
        revalidatePath('/')
        revalidatePath('/discover')
        if (previousDoc?.slug) revalidatePath(`/events/${previousDoc.slug}`)
        if (doc.slug) revalidatePath(`/events/${doc.slug}`)
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidateTag('public-events', { expire: 0 })
        if (doc.slug) revalidateTag(`event:${doc.slug}`, { expire: 0 })
        const organizer = typeof doc.organizer === 'object' ? doc.organizer?.id : doc.organizer
        if (organizer) revalidateTag(`organizer-events:${organizer}`, { expire: 0 })
        revalidatePath('/')
        revalidatePath('/discover')
        if (doc.slug) revalidatePath(`/events/${doc.slug}`)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: { role: { equals: 'organizer' } },
      admin: { position: 'sidebar' },
      access: {
        update: ({ req }) => isStaff(req.user),
      },
    },
    { name: 'title', type: 'text', required: true, index: true },
    { name: 'slug', type: 'slug', useAsSlug: 'title', unique: true, index: true },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
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
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    { name: 'shortDescription', type: 'text', maxLength: 180 },
    { name: 'description', type: 'textarea' },
    {
      name: 'eventFormat',
      type: 'select',
      defaultValue: 'physical',
      options: ['physical', 'virtual', 'hybrid'],
    },
    { name: 'visibility', type: 'select', defaultValue: 'public', options: ['public', 'private'] },
    {
      name: 'ageRestriction',
      type: 'select',
      defaultValue: 'all-ages',
      options: ['all-ages', '13+', '16+', '18+', '21+'],
    },
    { name: 'startsAt', type: 'date', index: true },
    { name: 'endsAt', type: 'date' },
    { name: 'venue', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'country', type: 'text', defaultValue: 'Nigeria' },
    { name: 'state', type: 'text', defaultValue: 'FCT' },
    { name: 'virtualLink', type: 'text' },
    {
      name: 'city',
      type: 'text',
      required: true,
      defaultValue: 'Abuja',
      access: { update: () => false },
      admin: { readOnly: true },
    },
    { name: 'capacity', type: 'number', min: 1 },
    { name: 'salesOpenAt', type: 'date' },
    { name: 'salesCloseAt', type: 'date' },
    {
      name: 'checkInStatus',
      type: 'select',
      defaultValue: 'closed',
      options: ['closed', 'open'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'scheduleType',
      type: 'select',
      defaultValue: 'single',
      options: ['single', 'recurring', 'multiple'],
    },
    {
      name: 'sessions',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'startsAt', type: 'date', required: true },
        { name: 'endsAt', type: 'date', required: true },
      ],
    },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'videoURL', type: 'text' },
    {
      name: 'pageAppearance',
      type: 'select',
      defaultValue: 'light',
      options: ['light', 'dark', 'turquoise'],
    },
    { name: 'contactName', type: 'text' },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    {
      name: 'attendeeQuestions',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: ['text', 'multiple-choice', 'checkbox', 'date'],
        },
        { name: 'required', type: 'checkbox', defaultValue: false },
        {
          name: 'options',
          type: 'array',
          fields: [{ name: 'label', type: 'text', required: true }],
        },
      ],
    },
    { name: 'terms', type: 'textarea' },
    { name: 'entryRequirements', type: 'textarea' },
    { name: 'refundPolicy', type: 'textarea' },
    {
      name: 'reviewStatus',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
      admin: { position: 'sidebar' },
    },
    { name: 'reviewNote', type: 'textarea' },
    { name: 'submittedAt', type: 'date' },
    { name: 'reviewedAt', type: 'date' },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'wizardStep', type: 'number', defaultValue: 1, min: 1, max: 6 },
  ],
}
