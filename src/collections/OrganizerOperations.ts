import type { CollectionConfig } from 'payload'
import { eventOwned, getAppUser, isStaff, organizerOwned, superAdminOnly } from '@/access/appAccess'

const setOrganizer = ({ data, operation, req }: any) => {
  const user = getAppUser(req.user)
  if (operation === 'create' && user && !isStaff(user)) data.organizer = user.id
  return data
}

export const Discounts: CollectionConfig = {
  slug: 'discounts',
  admin: { group: 'Commerce', useAsTitle: 'code' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: eventOwned,
    update: eventOwned,
    delete: eventOwned,
  },
  hooks: { beforeChange: [setOrganizer] },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'code', type: 'text', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: ['percentage', 'fixed'] },
    { name: 'value', type: 'number', required: true, min: 0 },
    { name: 'usageLimit', type: 'number', min: 1 },
    { name: 'usedCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'startsAt', type: 'date' },
    { name: 'endsAt', type: 'date' },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}

export const GuestListEntries: CollectionConfig = {
  slug: 'guest-list-entries',
  admin: { group: 'Ticketing', useAsTitle: 'name' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: eventOwned,
    update: eventOwned,
    delete: eventOwned,
  },
  hooks: { beforeChange: [setOrganizer] },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'quantity', type: 'number', required: true, defaultValue: 1, min: 1 },
    { name: 'notes', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'invited',
      options: ['invited', 'issued', 'checked-in', 'cancelled'],
    },
  ],
}

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: { group: 'Marketing', useAsTitle: 'subject' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: eventOwned,
    update: eventOwned,
    delete: eventOwned,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        setOrganizer({ data, operation, req })
        data.deliveryStatus = 'disabled'
        return data
      },
    ],
  },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'subject', type: 'text', required: true },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'audience',
      type: 'select',
      defaultValue: 'all-attendees',
      options: ['all-attendees', 'checked-in', 'not-checked-in'],
    },
    {
      name: 'deliveryStatus',
      type: 'select',
      defaultValue: 'disabled',
      options: ['disabled', 'queued', 'sent'],
      access: { update: () => false },
    },
  ],
}

export const EventCollections: CollectionConfig = {
  slug: 'event-collections',
  admin: { group: 'Marketing', useAsTitle: 'name' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: organizerOwned,
    delete: organizerOwned,
  },
  hooks: { beforeChange: [setOrganizer] },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'events', type: 'relationship', relationTo: 'events', hasMany: true },
  ],
}

export const BankVerifications: CollectionConfig = {
  slug: 'bank-verifications',
  admin: { group: 'Finance', useAsTitle: 'accountName' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: organizerOwned,
    delete: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        setOrganizer({ data, operation, req })
        const user = getAppUser(req.user)
        if (user && !isStaff(user)) data.status = 'pending'
        return data
      },
    ],
  },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'bankCode', type: 'text', required: true },
    { name: 'bankName', type: 'text', required: true },
    { name: 'accountNumber', type: 'text', required: true },
    { name: 'accountName', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'verified', 'rejected'],
      access: { update: ({ req }) => isStaff(req.user) },
    },
    { name: 'verifiedAt', type: 'date', access: { update: ({ req }) => isStaff(req.user) } },
  ],
}
