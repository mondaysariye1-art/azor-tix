import type { CollectionConfig } from 'payload'
import {
  eventOwned,
  getAppUser,
  isStaff,
  organizerOwned,
  staffOnly,
  superAdminOnly,
} from '@/access/appAccess'

const noPublicCreate = () => false

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: { group: 'Commerce', useAsTitle: 'reference' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: staffOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    {
      name: 'customer',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'email', type: 'email', required: true, index: true },
        { name: 'phone', type: 'text', required: true },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'ticketType', type: 'relationship', relationTo: 'ticket-types', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true, min: 1 },
        { name: 'unitPrice', type: 'number', required: true, min: 0 },
      ],
    },
    { name: 'subtotal', type: 'number', required: true, min: 0, access: { update: () => false } },
    { name: 'fees', type: 'number', required: true, min: 0, access: { update: () => false } },
    { name: 'serviceFeePercent', type: 'number', min: 0, access: { update: () => false } },
    { name: 'serviceFeeAmount', type: 'number', min: 0, access: { update: () => false } },
    { name: 'commissionPercent', type: 'number', min: 0, access: { update: () => false } },
    { name: 'commissionAmount', type: 'number', min: 0, access: { update: () => false } },
    { name: 'organizerEarnings', type: 'number', min: 0, access: { update: () => false } },
    { name: 'discountCode', type: 'text', access: { update: () => false } },
    { name: 'discountAmount', type: 'number', min: 0, access: { update: () => false } },
    {
      name: 'attendeeAnswers',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'text', required: true },
      ],
    },
    { name: 'total', type: 'number', required: true, min: 0, access: { update: () => false } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      index: true,
    },
    { name: 'paidAt', type: 'date' },
  ],
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: { group: 'Commerce', useAsTitle: 'providerReference' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'paystack',
      options: ['paystack'],
    },
    { name: 'providerReference', type: 'text', required: true, unique: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 0 },
    { name: 'currency', type: 'text', required: true, defaultValue: 'NGN' },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['initialized', 'success', 'failed', 'refunded'],
    },
    { name: 'verifiedAt', type: 'date' },
  ],
}

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  admin: { group: 'Ticketing', useAsTitle: 'code' },
  access: {
    create: noPublicCreate,
    read: eventOwned,
    update: eventOwned,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    { name: 'issuanceKey', type: 'text', unique: true, index: true },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'ticketType', type: 'relationship', relationTo: 'ticket-types', required: true },
    { name: 'attendeeName', type: 'text', required: true },
    { name: 'attendeeEmail', type: 'email', required: true, index: true },
    { name: 'attendeePhone', type: 'text' },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'purchase',
      options: ['purchase', 'complimentary', 'guest-list'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'valid',
      options: ['valid', 'used', 'refunded', 'void'],
    },
    { name: 'checkedInAt', type: 'date' },
    { name: 'checkedInBy', type: 'relationship', relationTo: 'users' },
  ],
}

export const TeamMemberships: CollectionConfig = {
  slug: 'team-memberships',
  admin: { group: 'Operations', useAsTitle: 'email' },
  access: {
    create: ({ req }) => Boolean(getAppUser(req.user)),
    read: organizerOwned,
    update: organizerOwned,
    delete: organizerOwned,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) data.organizer = user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: ['manager', 'check-in', 'analyst', 'finance'],
    },
    {
      name: 'permissions',
      type: 'select',
      hasMany: true,
      options: ['events', 'attendees', 'check-in', 'reports', 'finance'],
    },
    {
      name: 'invitationStatus',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'accepted', 'revoked'],
    },
    { name: 'active', type: 'checkbox', required: true, defaultValue: true },
  ],
}

export const PayoutRequests: CollectionConfig = {
  slug: 'payout-requests',
  admin: { group: 'Finance', useAsTitle: 'reference' },
  access: {
    create: superAdminOnly,
    read: organizerOwned,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        const user = getAppUser(req.user)
        if (operation === 'create' && user && !isStaff(user)) {
          data.organizer = user.id
          data.status = 'pending'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true },
    { name: 'organizer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'amount', type: 'number', required: true, min: 1000 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'approved', 'paid', 'rejected'],
    },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'reviewNote', type: 'textarea' },
    { name: 'paidAt', type: 'date' },
  ],
}

export const Refunds: CollectionConfig = {
  slug: 'refunds',
  admin: { group: 'Finance', useAsTitle: 'reference' },
  access: { create: staffOnly, read: eventOwned, update: superAdminOnly, delete: superAdminOnly },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true },
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'processed', 'failed'],
    },
  ],
}

export const Complaints: CollectionConfig = {
  slug: 'complaints',
  admin: { group: 'Operations', useAsTitle: 'subject' },
  access: { create: () => false, read: staffOnly, update: staffOnly, delete: superAdminOnly },
  fields: [
    { name: 'subject', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'orderReference', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: ['open', 'investigating', 'resolved', 'closed'],
    },
    { name: 'internalNotes', type: 'textarea' },
  ],
}

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: { group: 'Marketing', useAsTitle: 'email' },
  access: {
    create: () => false,
    read: staffOnly,
    update: staffOnly,
    delete: superAdminOnly,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'subscribed',
      options: ['subscribed', 'unsubscribed'],
    },
  ],
}
