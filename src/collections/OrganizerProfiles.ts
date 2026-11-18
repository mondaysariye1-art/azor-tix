import type { CollectionConfig } from 'payload'
import { getAppUser, isStaff } from '@/access/appAccess'
import { revalidatePath, revalidateTag } from 'next/cache'

export const OrganizerProfiles: CollectionConfig = {
  slug: 'organizer-profiles',
  admin: {
    group: 'Organizers',
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'slug', 'owner', 'updatedAt'],
  },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: () => true,
    update: ({ req }) => {
      const user = getAppUser(req.user)
      if (!user) return false
      if (isStaff(user)) return true
      return { owner: { equals: user.id } }
    },
    delete: ({ req }) => isStaff(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) data.owner = user.id
        return data
      },
    ],
    afterChange: [
      ({ doc, previousDoc }) => {
        revalidateTag('organizer-profiles', 'max')
        if (previousDoc?.slug) revalidateTag(`organizer:${previousDoc.slug}`, 'max')
        if (doc.slug) revalidateTag(`organizer:${doc.slug}`, 'max')
        if (previousDoc?.slug) revalidatePath(`/organizers/${previousDoc.slug}`)
        if (doc.slug) revalidatePath(`/organizers/${doc.slug}`)
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidateTag('organizer-profiles', 'max')
        if (doc.slug) {
          revalidateTag(`organizer:${doc.slug}`, 'max')
          revalidatePath(`/organizers/${doc.slug}`)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      access: { update: ({ req }) => isStaff(req.user) },
    },
    { name: 'displayName', type: 'text', required: true },
    { name: 'slug', type: 'slug', useAsSlug: 'displayName' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'about', type: 'textarea' },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
        { name: 'tiktok', type: 'text' },
        { name: 'website', type: 'text' },
      ],
    },
  ],
}
