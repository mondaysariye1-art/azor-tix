import type { CollectionConfig } from 'payload'
import {
  eventOwned,
  getAppUser,
  isStaff,
  organizerOwned,
  staffOnly,
  superAdminOnly,
} from '@/access/appAccess'

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
    update: staffOnly,
    delete: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc, req }) => {
        setOrganizer({ data, operation, req })
        const user = getAppUser(req.user)
        if (operation === 'update' && originalDoc?.locked && user && !isStaff(user)) {
          throw new Error(
            'Your verified bank account is locked. Submit a bank account change appeal for review.',
          )
        }
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
    { name: 'locked', type: 'checkbox', defaultValue: false },
    { name: 'verificationProvider', type: 'text', defaultValue: 'paystack' },
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

export const BankChangeAppeals: CollectionConfig = {
  slug: 'bank-change-appeals',
  admin: { group: 'Finance', useAsTitle: 'proposedAccountName' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: staffOnly,
    delete: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        setOrganizer({ data, operation, req })
        return data
      },
    ],
  },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'currentBankName', type: 'text', required: true },
    { name: 'currentBankCode', type: 'text', required: true },
    { name: 'currentAccountNumber', type: 'text', required: true },
    { name: 'currentAccountName', type: 'text', required: true },
    { name: 'proposedBankName', type: 'text', required: true },
    { name: 'proposedBankCode', type: 'text', required: true },
    { name: 'proposedAccountNumber', type: 'text', required: true },
    { name: 'proposedAccountName', type: 'text', required: true },
    { name: 'verificationProvider', type: 'text', defaultValue: 'paystack' },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'approved', 'rejected'],
      index: true,
    },
    { name: 'submittedAt', type: 'date', required: true },
    { name: 'reviewEligibleAt', type: 'date', required: true },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'reviewedByRole', type: 'text' },
    { name: 'reviewedAt', type: 'date' },
    { name: 'reviewNote', type: 'textarea' },
    { name: 'overriddenBy', type: 'relationship', relationTo: 'users' },
    {
      name: 'auditHistory',
      type: 'array',
      fields: [
        { name: 'action', type: 'text', required: true },
        { name: 'actorEmail', type: 'text', required: true },
        { name: 'actorRole', type: 'text', required: true },
        { name: 'note', type: 'text' },
        { name: 'at', type: 'date', required: true },
      ],
    },
  ],
}

export const FreeTicketLinks: CollectionConfig = {
  slug: 'free-ticket-links',
  admin: { group: 'Ticketing', useAsTitle: 'code' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: organizerOwned,
    delete: organizerOwned,
  },
  hooks: { beforeChange: [setOrganizer] },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'ticketType', type: 'relationship', relationTo: 'ticket-types', required: false },
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'invitationType', type: 'text', defaultValue: 'individual' },
    { name: 'categoryLabel', type: 'text', defaultValue: 'Private Free Invitation' },
    { name: 'maxClaims', type: 'number', defaultValue: 1, min: 1 },
    { name: 'claimedCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'recipientName', type: 'text' },
    { name: 'recipientEmail', type: 'email' },
    { name: 'personalMessage', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'claimed', 'exhausted', 'expired', 'revoked'],
      index: true,
    },
    { name: 'expiresAt', type: 'date' },
    { name: 'claimedAt', type: 'date' },
    { name: 'claimedByName', type: 'text' },
    { name: 'claimedByEmail', type: 'email' },
    { name: 'ticket', type: 'relationship', relationTo: 'tickets' },
    { name: 'claims', type: 'json' },
  ],
}
