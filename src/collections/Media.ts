import type { CollectionConfig } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

import { createFolderField, createTagField } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const events = await req.payload.find({
          collection: 'events',
          overrideAccess: true,
          where: {
            or: [{ heroImage: { equals: doc.id } }, { gallery: { equals: doc.id } }],
          },
          limit: 100,
          depth: 0,
        })
        for (const event of events.docs) {
          revalidateTag('public-events', 'max')
          if (event.slug) {
            revalidateTag(`event:${event.slug}`, 'max')
            revalidatePath(`/events/${event.slug}`)
          }
        }
        const profiles = await req.payload.find({
          collection: 'organizer-profiles',
          overrideAccess: true,
          where: { logo: { equals: doc.id } },
          limit: 100,
          depth: 0,
        })
        for (const profile of profiles.docs) {
          revalidateTag('organizer-profiles', 'max')
          if (profile.slug) {
            revalidateTag(`organizer:${profile.slug}`, 'max')
            revalidatePath(`/organizers/${profile.slug}`)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    createFolderField({ relationTo: 'folders' }),
    createTagField({ relationTo: 'tags' }),
  ],
  upload: {
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      return headers
    },
  },
}
